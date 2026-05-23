import { ConvexError, v } from "convex/values";

import { Doc } from "@/convex/_generated/dataModel";
import { mutation, query } from "@/convex/_generated/server";
import { requireRole } from "@/convex/lib/auth";
import {
  BUILT_IN_INTERNSHIP_CATEGORIES,
  buildCategoryOptionFromDoc,
  getApprovedCategoryOptions,
  isBuiltInCategorySlug,
  normalizeCategoryName,
  normalizeCategorySlug,
} from "@/convex/lib/internshipCategories";
import { createNotification } from "@/convex/lib/notifications";

const categoryStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

function assertValidCategoryName(name: string) {
  const normalizedName = normalizeCategoryName(name);
  const slug = normalizeCategorySlug(normalizedName);

  if (normalizedName.length < 2) {
    throw new ConvexError("Category name should be at least 2 characters");
  }

  if (normalizedName.length > 60) {
    throw new ConvexError("Category name should be 60 characters or fewer");
  }

  if (!slug) {
    throw new ConvexError("Category name must include letters or numbers");
  }

  return { name: normalizedName, slug };
}

async function notifyAdminsOfCategoryRequest(
  ctx: Parameters<typeof createNotification>[0],
  category: Pick<Doc<"internshipCategories">, "_id" | "name">
) {
  const admins = (
    await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect()
  ).filter((admin) => admin.isSuspended !== true);

  await Promise.all(
    admins.map((admin) =>
      createNotification(ctx, {
        userId: admin._id,
        type: "category_request",
        title: "New category request",
        message: `A recruiter requested "${category.name}" as a new internship category.`,
        link: "/admin/categories",
        relatedId: category._id,
      })
    )
  );
}

async function notifyRecruiterOfCategoryReview(
  ctx: Parameters<typeof createNotification>[0],
  category: Pick<Doc<"internshipCategories">, "_id" | "name" | "requestedBy">,
  status: "approved" | "rejected",
  adminNotes: string | undefined
) {
  if (!category.requestedBy) {
    return;
  }

  const isApproved = status === "approved";
  const noteSuffix = adminNotes ? ` Note from admin: ${adminNotes}` : "";

  await createNotification(ctx, {
    userId: category.requestedBy,
    type: "category_review",
    title: isApproved
      ? "Category request approved"
      : "Category request rejected",
    message: isApproved
      ? `"${category.name}" is now available for internship listings.`
      : `Your request for "${category.name}" was rejected.${noteSuffix}`,
    link: "/recruiter/internships/new",
    relatedId: category._id,
  });
}

export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    return await getApprovedCategoryOptions(ctx);
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(categoryStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const requestedCategories = args.status
      ? await ctx.db
          .query("internshipCategories")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("internshipCategories").order("desc").collect();

    const rows = requestedCategories.map(buildCategoryOptionFromDoc);

    if (args.status && args.status !== "approved") {
      return rows;
    }

    const requestedSlugs = new Set(rows.map((category) => category.slug));
    const builtIns = BUILT_IN_INTERNSHIP_CATEGORIES.filter(
      (category) => !requestedSlugs.has(category.slug)
    ).map((category) => ({
      _id: null,
      _creationTime: 0,
      name: category.name,
      slug: category.slug,
      status: "approved" as const,
      requestedBy: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      adminNotes: undefined,
      createdAt: 0,
      updatedAt: 0,
      isBuiltIn: true,
    }));

    return [...rows, ...builtIns].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status.localeCompare(b.status);
      }

      return a.name.localeCompare(b.name);
    });
  },
});

export const request = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const { name, slug } = assertValidCategoryName(args.name);

    if (isBuiltInCategorySlug(slug)) {
      throw new ConvexError("That category is already available");
    }

    const existing = await ctx.db
      .query("internshipCategories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const now = Date.now();

    if (existing) {
      if (existing.status === "approved") {
        throw new ConvexError("That category is already available");
      }

      if (existing.status === "pending") {
        return existing;
      }

      await ctx.db.patch(existing._id, {
        name,
        status: "pending",
        requestedBy: recruiter._id,
        reviewedBy: undefined,
        reviewedAt: undefined,
        adminNotes: undefined,
        updatedAt: now,
      });

      await notifyAdminsOfCategoryRequest(ctx, {
        _id: existing._id,
        name,
      });

      return {
        ...existing,
        name,
        status: "pending" as const,
        requestedBy: recruiter._id,
        reviewedBy: undefined,
        reviewedAt: undefined,
        adminNotes: undefined,
        updatedAt: now,
      };
    }

    const categoryId = await ctx.db.insert("internshipCategories", {
      name,
      slug,
      status: "pending",
      requestedBy: recruiter._id,
      createdAt: now,
      updatedAt: now,
    });

    const category = await ctx.db.get(categoryId);

    if (category) {
      await notifyAdminsOfCategoryRequest(ctx, category);
    }

    return category;
  },
});

export const review = mutation({
  args: {
    categoryId: v.id("internshipCategories"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const category = await ctx.db.get(args.categoryId);

    if (!category) {
      throw new ConvexError("Category request not found");
    }

    const now = Date.now();
    const adminNotes = args.adminNotes?.trim() || undefined;

    await ctx.db.patch(args.categoryId, {
      status: args.status,
      reviewedBy: admin._id,
      reviewedAt: now,
      adminNotes,
      updatedAt: now,
    });

    await notifyRecruiterOfCategoryReview(
      ctx,
      category,
      args.status,
      adminNotes
    );

    return null;
  },
});

export const seedBuiltIns = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const category of BUILT_IN_INTERNSHIP_CATEGORIES) {
      const existing = await ctx.db
        .query("internshipCategories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .unique();

      if (!existing) {
        await ctx.db.insert("internshipCategories", {
          ...category,
          status: "approved",
          createdAt: now,
          updatedAt: now,
        });
        inserted += 1;
        continue;
      }

      if (existing.status !== "approved" || existing.name !== category.name) {
        await ctx.db.patch(existing._id, {
          name: category.name,
          status: "approved",
          updatedAt: now,
        });
        updated += 1;
      }
    }

    return { inserted, updated };
  },
});
