import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  internalMutation,
  mutation,
  query,
} from "@/convex/_generated/server";
import { getCurrentUser, requireRole } from "@/convex/lib/auth";
import { createNotification } from "@/convex/lib/notifications";

const internshipCategoryValidator = v.union(
  v.literal("technology"),
  v.literal("business"),
  v.literal("design"),
  v.literal("marketing"),
  v.literal("finance"),
  v.literal("healthcare"),
  v.literal("other")
);

const locationTypeValidator = v.union(
  v.literal("remote"),
  v.literal("onsite"),
  v.literal("hybrid")
);

const internshipStatusValidator = v.union(
  v.literal("draft"),
  v.literal("open"),
  v.literal("closed")
);

const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
  id: v.optional(v.number()),
});

const APP_URL = process.env.APP_URL?.replace(/\/$/, "") ?? "";

function ensureFutureDeadline(timestamp: number) {
  if (timestamp <= Date.now()) {
    throw new ConvexError("Application deadline must be in the future");
  }
}

function buildInternshipPath(internshipId: string) {
  return `/internships/${internshipId}`;
}

function buildInternshipUrl(internshipId: string) {
  const path = buildInternshipPath(internshipId);
  return APP_URL ? `${APP_URL}${path}` : path;
}

function includesMatchingCategory(
  preferredCategories: string[] | undefined,
  internshipCategory: Doc<"internships">["category"]
) {
  return preferredCategories?.includes(internshipCategory) ?? false;
}

async function scheduleMatchingInternshipNotifications(
  ctx: MutationCtx,
  internshipId: Doc<"internships">["_id"]
) {
  await ctx.scheduler.runAfter(
    0,
    internal.internships.notifyMatchingCandidates,
    {
      internshipId,
    }
  );
}

export const create = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    description: v.string(),
    category: internshipCategoryValidator,
    location: v.string(),
    locationType: locationTypeValidator,
    duration: v.string(),
    stipend: v.optional(v.number()),
    requirements: v.array(v.string()),
    status: internshipStatusValidator,
    applicationDeadline: v.number(),
    maxApplications: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");

    ensureFutureDeadline(args.applicationDeadline);

    const now = Date.now();
    const internshipId = await ctx.db.insert("internships", {
      recruiterId: recruiter._id,
      title: args.title.trim(),
      company: args.company.trim(),
      description: args.description,
      category: args.category,
      location: args.location.trim(),
      locationType: args.locationType,
      duration: args.duration.trim(),
      requirements: args.requirements.map((requirement) => requirement.trim()),
      status: args.status,
      applicationDeadline: args.applicationDeadline,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      ...(args.stipend === undefined ? {} : { stipend: args.stipend }),
      ...(args.maxApplications === undefined
        ? {}
        : { maxApplications: args.maxApplications }),
    });

    if (args.status === "open") {
      await scheduleMatchingInternshipNotifications(ctx, internshipId);
    }

    return internshipId;
  },
});

export const update = mutation({
  args: {
    internshipId: v.id("internships"),
    title: v.string(),
    company: v.string(),
    description: v.string(),
    category: internshipCategoryValidator,
    location: v.string(),
    locationType: locationTypeValidator,
    duration: v.string(),
    stipend: v.optional(v.number()),
    requirements: v.array(v.string()),
    status: internshipStatusValidator,
    applicationDeadline: v.number(),
    maxApplications: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    ensureFutureDeadline(args.applicationDeadline);

    const shouldNotifyMatches =
      internship.status !== "open" && args.status === "open";

    await ctx.db.patch(args.internshipId, {
      title: args.title.trim(),
      company: args.company.trim(),
      description: args.description,
      category: args.category,
      location: args.location.trim(),
      locationType: args.locationType,
      duration: args.duration.trim(),
      requirements: args.requirements.map((requirement) => requirement.trim()),
      status: args.status,
      applicationDeadline: args.applicationDeadline,
      updatedAt: Date.now(),
      ...(args.stipend === undefined ? {} : { stipend: args.stipend }),
      ...(args.maxApplications === undefined
        ? {}
        : { maxApplications: args.maxApplications }),
    });

    if (shouldNotifyMatches) {
      await scheduleMatchingInternshipNotifications(ctx, args.internshipId);
    }

    return null;
  },
});

export const updateStatus = mutation({
  args: {
    internshipId: v.id("internships"),
    status: internshipStatusValidator,
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    const shouldNotifyMatches =
      internship.status !== "open" && args.status === "open";

    await ctx.db.patch(args.internshipId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    if (shouldNotifyMatches) {
      await scheduleMatchingInternshipNotifications(ctx, args.internshipId);
    }

    return null;
  },
});

export const getPublic = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<Doc<"internships"> | null> => {
    const internship = await ctx.db.get(args.internshipId);

    if (!internship || internship.status !== "open") {
      return null;
    }

    return internship;
  },
});

export const getForRecruiter = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<Doc<"internships"> | null> => {
    const recruiter = await getCurrentUser(ctx);
    if (!recruiter || recruiter.role !== "recruiter") {
      return null;
    }

    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      return null;
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    return internship;
  },
});

export const listForRecruiter = query({
  args: {
    status: v.optional(internshipStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");

    if (args.status) {
      return await ctx.db
        .query("internships")
        .withIndex("by_recruiter_and_status", (q) =>
          q.eq("recruiterId", recruiter._id).eq("status", args.status!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("internships")
      .withIndex("by_recruiter", (q) => q.eq("recruiterId", recruiter._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listAllForRecruiter = query({
  args: {
    status: v.optional(internshipStatusValidator),
  },
  handler: async (ctx, args): Promise<Doc<"internships">[]> => {
    const recruiter = await requireRole(ctx, "recruiter");

    if (args.status) {
      return await ctx.db
        .query("internships")
        .withIndex("by_recruiter_and_status", (q) =>
          q.eq("recruiterId", recruiter._id).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("internships")
      .withIndex("by_recruiter", (q) => q.eq("recruiterId", recruiter._id))
      .order("desc")
      .collect();
  },
});

export const listPublic = query({
  args: {
    category: v.optional(internshipCategoryValidator),
    locationType: v.optional(locationTypeValidator),
    sortBy: v.union(
      v.literal("newest"),
      v.literal("deadline"),
      v.literal("stipend")
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.sortBy === "deadline") {
      const paginated = await ctx.db
        .query("internships")
        .withIndex("by_status_and_deadline", (q) => q.eq("status", "open"))
        .order("asc")
        .paginate(args.paginationOpts);

      const page = paginated.page.filter((internship) => {
        if (args.category && internship.category !== args.category) {
          return false;
        }

        if (
          args.locationType &&
          internship.locationType !== args.locationType
        ) {
          return false;
        }

        return true;
      });

      return {
        ...paginated,
        page,
      };
    }

    if (args.sortBy === "stipend") {
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .order("desc")
        .take(500);

      const filtered = internships.filter((internship) => {
        if (args.category && internship.category !== args.category) {
          return false;
        }

        if (
          args.locationType &&
          internship.locationType !== args.locationType
        ) {
          return false;
        }

        return true;
      });

      filtered.sort((a, b) => {
        const aStipend = a.stipend ?? -1;
        const bStipend = b.stipend ?? -1;
        return bStipend - aStipend;
      });

      const start = args.paginationOpts.cursor
        ? Number.parseInt(args.paginationOpts.cursor, 10)
        : 0;
      const end = start + args.paginationOpts.numItems;
      const page = filtered.slice(start, end);
      const isDone = end >= filtered.length;

      return {
        page,
        isDone,
        continueCursor: isDone ? "" : String(end),
      };
    }

    if (args.category && args.locationType) {
      const paginated = await ctx.db
        .query("internships")
        .withIndex("by_category_and_status_and_locationType", (q) =>
          q
            .eq("category", args.category!)
            .eq("status", "open")
            .eq("locationType", args.locationType!)
        )
        .order("desc")
        .paginate(args.paginationOpts);

      return paginated;
    }

    if (args.category) {
      const paginated = await ctx.db
        .query("internships")
        .withIndex("by_category_and_status", (q) =>
          q.eq("category", args.category!).eq("status", "open")
        )
        .order("desc")
        .paginate(args.paginationOpts);

      if (!args.locationType) {
        return paginated;
      }

      return {
        ...paginated,
        page: paginated.page.filter(
          (internship) => internship.locationType === args.locationType
        ),
      };
    }

    if (args.locationType) {
      return await ctx.db
        .query("internships")
        .withIndex("by_status_and_locationType", (q) =>
          q.eq("status", "open").eq("locationType", args.locationType!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("internships")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchPublic = query({
  args: {
    query: v.string(),
    category: v.optional(internshipCategoryValidator),
    locationType: v.optional(locationTypeValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim();

    if (!searchTerm) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const results = await ctx.db
      .query("internships")
      .withSearchIndex("search_internships", (q) => {
        let scoped = q.search("title", searchTerm).eq("status", "open");

        if (args.category) {
          scoped = scoped.eq("category", args.category);
        }

        if (args.locationType) {
          scoped = scoped.eq("locationType", args.locationType);
        }

        return scoped;
      })
      .paginate(args.paginationOpts);

    return results;
  },
});

export const trackView = mutation({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<null> => {
    const internship = await ctx.db.get(args.internshipId);
    if (!internship || internship.status !== "open") {
      return null;
    }

    const currentUser = await getCurrentUser(ctx);
    const now = Date.now();

    if (currentUser) {
      const oneHourAgo = now - 60 * 60 * 1000;
      const recentViews = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship_and_viewer_and_viewedAt", (q) =>
          q
            .eq("internshipId", args.internshipId)
            .eq("viewerId", currentUser._id)
            .gte("viewedAt", oneHourAgo)
        )
        .take(1);

      if (recentViews.length > 0) {
        return null;
      }

      await ctx.db.insert("internshipViews", {
        internshipId: args.internshipId,
        viewerId: currentUser._id,
        viewedAt: now,
      });
    } else {
      await ctx.db.insert("internshipViews", {
        internshipId: args.internshipId,
        viewedAt: now,
      });
    }

    await ctx.db.patch(args.internshipId, {
      viewCount: internship.viewCount + 1,
      updatedAt: now,
    });

    return null;
  },
});

export const notifyMatchingCandidates = internalMutation({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<null> => {
    const internship = await ctx.db.get(args.internshipId);

    if (!internship || internship.status !== "open") {
      return null;
    }

    const profiles = await ctx.db.query("candidateProfiles").collect();
    const internshipPath = buildInternshipPath(internship._id);
    const internshipUrl = buildInternshipUrl(internship._id);

    for (const profile of profiles) {
      const matchesCategory = includesMatchingCategory(
        profile.preferredCategories,
        internship.category
      );
      const matchesLocationType =
        profile.preferredLocationType === internship.locationType;

      if (!matchesCategory && !matchesLocationType) {
        continue;
      }

      const candidate = await ctx.db.get(profile.userId);

      if (!candidate) {
        continue;
      }

      await createNotification(ctx, {
        userId: candidate._id,
        type: "new_internship",
        title: `New internship: ${internship.title}`,
        message: `${internship.company} just posted an internship matching your preferences.`,
        link: internshipPath,
        relatedId: internship._id,
      });

      if (!candidate.email) {
        continue;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.emailActions.sendNewInternshipEmail,
        {
          to: candidate.email,
          name: candidate.name,
          internshipTitle: internship.title,
          company: internship.company,
          internshipUrl,
        }
      );
    }

    return null;
  },
});
