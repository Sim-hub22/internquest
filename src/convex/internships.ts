import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
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
const MAX_PUBLIC_INTERNSHIP_SCAN = 500;

type PublicInternshipsPage = {
  page: Doc<"internships">[];
  isDone: boolean;
  continueCursor: string;
};

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

function assertRecruiterCanManageInternship(internship: Doc<"internships">) {
  if (internship.isClosedByAdmin === true) {
    throw new ConvexError(
      "This listing was closed by an admin and can no longer be edited"
    );
  }
}

function includesMatchingCategory(
  preferredCategories: string[] | undefined,
  internshipCategory: Doc<"internships">["category"]
) {
  return preferredCategories?.includes(internshipCategory) ?? false;
}

function isInternshipPubliclyActive(
  internship: Pick<Doc<"internships">, "status" | "applicationDeadline"> | null,
  now = Date.now()
) {
  return (
    internship !== null &&
    internship.status === "open" &&
    internship.applicationDeadline > now
  );
}

async function isInternshipPubliclyVisible(
  ctx: QueryCtx | MutationCtx,
  internship: Doc<"internships"> | null,
  now = Date.now()
): Promise<boolean> {
  if (!internship || !isInternshipPubliclyActive(internship, now)) {
    return false;
  }

  const recruiter = await ctx.db.get(internship.recruiterId);
  return recruiter !== null;
}

async function filterPublicInternships(
  ctx: QueryCtx,
  internships: Doc<"internships">[],
  now = Date.now()
) {
  const visibility = await Promise.all(
    internships.map(async (internship) => ({
      internship,
      isVisible: await isInternshipPubliclyVisible(ctx, internship, now),
    }))
  );

  return visibility
    .filter((entry) => entry.isVisible)
    .map((entry) => entry.internship);
}

function paginateInternshipSlice(
  internships: Doc<"internships">[],
  paginationOpts: { numItems: number; cursor: string | null }
): PublicInternshipsPage {
  const start = paginationOpts.cursor
    ? Number.parseInt(paginationOpts.cursor, 10)
    : 0;
  const end = start + paginationOpts.numItems;
  const page = internships.slice(start, end);
  const isDone = end >= internships.length;

  return {
    page,
    isDone,
    continueCursor: isDone ? "" : String(end),
  };
}

function matchesPublicInternshipFilters(
  internship: Doc<"internships">,
  filters: {
    category?: Doc<"internships">["category"];
    locationType?: Doc<"internships">["locationType"];
  }
) {
  if (filters.category && internship.category !== filters.category) {
    return false;
  }

  if (
    filters.locationType &&
    internship.locationType !== filters.locationType
  ) {
    return false;
  }

  return true;
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

async function getInternshipDeleteState(
  ctx: QueryCtx | MutationCtx,
  internshipId: Id<"internships">
) {
  const [application] = await ctx.db
    .query("applications")
    .withIndex("by_internship", (q) => q.eq("internshipId", internshipId))
    .take(1);

  if (application) {
    return {
      canDelete: false,
      deleteDisabledReason:
        "This listing already has applications, so it must stay in history.",
    };
  }

  const [linkedQuiz] = await ctx.db
    .query("quizzes")
    .withIndex("by_internship", (q) => q.eq("internshipId", internshipId))
    .take(1);

  if (linkedQuiz) {
    return {
      canDelete: false,
      deleteDisabledReason:
        "This listing is linked to a recruitment quiz, so remove or unlink that quiz first.",
    };
  }

  return {
    canDelete: true,
    deleteDisabledReason: null,
  };
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

    if (
      isInternshipPubliclyActive({
        status: args.status,
        applicationDeadline: args.applicationDeadline,
      })
    ) {
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

    assertRecruiterCanManageInternship(internship);

    ensureFutureDeadline(args.applicationDeadline);

    const shouldNotifyMatches =
      !isInternshipPubliclyActive(internship) &&
      isInternshipPubliclyActive({
        status: args.status,
        applicationDeadline: args.applicationDeadline,
      });

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

    assertRecruiterCanManageInternship(internship);

    if (args.status === "open") {
      ensureFutureDeadline(internship.applicationDeadline);
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

export const remove = mutation({
  args: {
    internshipId: v.id("internships"),
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

    assertRecruiterCanManageInternship(internship);

    const deleteState = await getInternshipDeleteState(ctx, internship._id);

    if (!deleteState.canDelete) {
      throw new ConvexError(
        deleteState.deleteDisabledReason ?? "This listing cannot be deleted"
      );
    }

    const internshipViews = await ctx.db
      .query("internshipViews")
      .withIndex("by_internship", (q) => q.eq("internshipId", internship._id))
      .collect();
    const internshipReports = (
      await ctx.db
        .query("reports")
        .withIndex("by_targetType", (q) => q.eq("targetType", "internship"))
        .collect()
    ).filter((report) => report.targetId === internship._id);

    await Promise.all([
      ...internshipViews.map((view) => ctx.db.delete(view._id)),
      ...internshipReports.map((report) => ctx.db.delete(report._id)),
    ]);

    await ctx.db.delete(internship._id);

    return null;
  },
});

export const getPublic = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<Doc<"internships"> | null> => {
    const internship = await ctx.db.get(args.internshipId);

    if (!(await isInternshipPubliclyVisible(ctx, internship))) {
      return null;
    }

    return internship;
  },
});

export const getForRecruiter = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args) => {
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

    const deleteState = await getInternshipDeleteState(ctx, internship._id);

    return {
      ...internship,
      ...deleteState,
    };
  },
});

export const getRecruiterBreadcrumbLabel = query({
  args: {
    internshipId: v.id("internships"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const recruiter = await getCurrentUser(ctx);

    if (!recruiter || recruiter.role !== "recruiter") {
      return null;
    }

    const internship = await ctx.db.get(args.internshipId);

    if (!internship || internship.recruiterId !== recruiter._id) {
      return null;
    }

    return internship.title;
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
    const now = Date.now();
    const matchesFilters = (internship: Doc<"internships">) =>
      matchesPublicInternshipFilters(internship, {
        category: args.category,
        locationType: args.locationType,
      });
    const buildResponse = async (internships: Doc<"internships">[]) => {
      const filtered = (
        await filterPublicInternships(ctx, internships, now)
      ).filter(matchesFilters);
      return paginateInternshipSlice(filtered, args.paginationOpts);
    };

    if (args.sortBy === "deadline") {
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_status_and_deadline", (q) =>
          q.eq("status", "open").gt("applicationDeadline", now)
        )
        .order("asc")
        .take(MAX_PUBLIC_INTERNSHIP_SCAN);

      return await buildResponse(internships);
    }

    if (args.sortBy === "stipend") {
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .order("desc")
        .take(500);
      const visibleInternships = await filterPublicInternships(
        ctx,
        internships,
        now
      );

      const filtered = visibleInternships.filter(matchesFilters);

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
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_category_and_status_and_locationType", (q) =>
          q
            .eq("category", args.category!)
            .eq("status", "open")
            .eq("locationType", args.locationType!)
        )
        .order("desc")
        .take(MAX_PUBLIC_INTERNSHIP_SCAN);

      return await buildResponse(internships);
    }

    if (args.category) {
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_category_and_status", (q) =>
          q.eq("category", args.category!).eq("status", "open")
        )
        .order("desc")
        .take(MAX_PUBLIC_INTERNSHIP_SCAN);

      return await buildResponse(internships);
    }

    if (args.locationType) {
      const internships = await ctx.db
        .query("internships")
        .withIndex("by_status_and_locationType", (q) =>
          q.eq("status", "open").eq("locationType", args.locationType!)
        )
        .order("desc")
        .take(MAX_PUBLIC_INTERNSHIP_SCAN);

      return await buildResponse(internships);
    }

    const internships = await ctx.db
      .query("internships")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(MAX_PUBLIC_INTERNSHIP_SCAN);

    return await buildResponse(internships);
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
    const now = Date.now();

    if (!searchTerm) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const internships = await ctx.db
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
      .take(MAX_PUBLIC_INTERNSHIP_SCAN);

    const filtered = await filterPublicInternships(ctx, internships, now);
    return paginateInternshipSlice(filtered, args.paginationOpts);
  },
});

export const trackView = mutation({
  args: {
    internshipId: v.id("internships"),
    viewerKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const internship = await ctx.db.get(args.internshipId);
    if (!(await isInternshipPubliclyVisible(ctx, internship))) {
      return null;
    }
    if (!internship) {
      return null;
    }

    const currentUser = await getCurrentUser(ctx);
    if (currentUser && currentUser._id === internship.recruiterId) {
      return null;
    }

    const viewerKey = currentUser
      ? `user:${currentUser._id}`
      : args.viewerKey?.trim();

    if (!viewerKey) {
      return null;
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentViews = await ctx.db
      .query("internshipViews")
      .withIndex("by_internship_and_viewerKey_and_viewedAt", (q) =>
        q
          .eq("internshipId", args.internshipId)
          .eq("viewerKey", viewerKey)
          .gte("viewedAt", oneHourAgo)
      )
      .take(1);

    if (recentViews.length > 0) {
      return null;
    }

    await ctx.db.insert("internshipViews", {
      internshipId: args.internshipId,
      viewerId: currentUser?._id,
      viewerKey,
      viewedAt: now,
    });

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

    if (!(await isInternshipPubliclyVisible(ctx, internship))) {
      return null;
    }
    if (!internship) {
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
