import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { QueryCtx, query } from "@/convex/_generated/server";
import { requireRole } from "@/convex/lib/auth";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAY_COUNT = 30;

const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
  "accepted",
  "rejected",
] as const;

const FUNNEL_SHORTLISTED_STATUSES = new Set([
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
  "accepted",
]);
const ACTIVE_PIPELINE_STATUSES = new Set<ApplicationStatus>([
  "applied",
  "under_review",
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
]);

const INTERNSHIP_CATEGORIES = [
  "technology",
  "business",
  "design",
  "marketing",
  "finance",
  "healthcare",
  "other",
] as const;

type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
type InternshipCategory = (typeof INTERNSHIP_CATEGORIES)[number];

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getUtcDayStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getTrendRangeStart() {
  return getUtcDayStart(Date.now()) - (TREND_DAY_COUNT - 1) * DAY_MS;
}

function formatDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDayLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function createDailySeries() {
  const start = getTrendRangeStart();

  return Array.from({ length: TREND_DAY_COUNT }, (_, index) => {
    const timestamp = start + index * DAY_MS;

    return {
      date: formatDayKey(timestamp),
      label: formatDayLabel(timestamp),
      views: 0,
      applications: 0,
    };
  });
}

function calculateRate(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

async function getInternshipForRecruiter(
  ctx: QueryCtx,
  recruiterId: Id<"users">,
  internshipId: Id<"internships">
) {
  const internship = await ctx.db.get(internshipId);

  if (!internship) {
    throw new ConvexError("Internship not found");
  }

  if (internship.recruiterId !== recruiterId) {
    throw new ConvexError("FORBIDDEN");
  }

  return internship;
}

async function listRecruiterInternships(
  ctx: QueryCtx,
  recruiterId: Id<"users">
) {
  return await ctx.db
    .query("internships")
    .withIndex("by_recruiter", (q) => q.eq("recruiterId", recruiterId))
    .collect();
}

async function listInternshipApplications(
  ctx: QueryCtx,
  internshipId: Id<"internships">
) {
  return await ctx.db
    .query("applications")
    .withIndex("by_internship", (q) => q.eq("internshipId", internshipId))
    .collect();
}

async function listLatestInternshipApplications(
  ctx: QueryCtx,
  internshipId: Id<"internships">,
  limit: number
) {
  return await ctx.db
    .query("applications")
    .withIndex("by_internship_and_appliedAt", (q) =>
      q.eq("internshipId", internshipId)
    )
    .order("desc")
    .take(limit);
}

async function listRecentInternshipApplications(
  ctx: QueryCtx,
  internshipId: Id<"internships">,
  startTimestamp: number
) {
  return await ctx.db
    .query("applications")
    .withIndex("by_internship_and_appliedAt", (q) =>
      q.eq("internshipId", internshipId).gte("appliedAt", startTimestamp)
    )
    .collect();
}

async function listRecentInternshipViews(
  ctx: QueryCtx,
  internshipId: Id<"internships">,
  startTimestamp: number
) {
  return await ctx.db
    .query("internshipViews")
    .withIndex("by_internship_and_date", (q) =>
      q.eq("internshipId", internshipId).gte("viewedAt", startTimestamp)
    )
    .collect();
}

async function listRecruiterRecruitmentQuizzes(
  ctx: QueryCtx,
  recruiterId: Id<"users">
) {
  return await ctx.db
    .query("quizzes")
    .withIndex("by_creator_and_type", (q) =>
      q.eq("creatorId", recruiterId).eq("type", "recruitment")
    )
    .collect();
}

async function listSubmittedQuizAttempts(ctx: QueryCtx, quizId: Id<"quizzes">) {
  return await ctx.db
    .query("quizAttempts")
    .withIndex("by_quiz_and_status", (q) =>
      q.eq("quizId", quizId).eq("status", "submitted")
    )
    .collect();
}

function buildStatusBreakdown(applications: Doc<"applications">[]) {
  const counts = new Map<ApplicationStatus, number>(
    APPLICATION_STATUSES.map((status) => [status, 0])
  );

  for (const application of applications) {
    counts.set(
      application.status,
      (counts.get(application.status as ApplicationStatus) ?? 0) + 1
    );
  }

  return APPLICATION_STATUSES.map((status) => ({
    status,
    label: toDisplayLabel(status),
    count: counts.get(status) ?? 0,
  }));
}

function buildViewsSeries(views: Doc<"internshipViews">[]) {
  const series = createDailySeries();
  const seriesIndex = new Map(series.map((item) => [item.date, item]));

  for (const view of views) {
    const dayKey = formatDayKey(getUtcDayStart(view.viewedAt));
    const entry = seriesIndex.get(dayKey);

    if (entry) {
      entry.views += 1;
    }
  }

  return series.map(({ date, label, views: count }) => ({
    date,
    label,
    views: count,
  }));
}

function buildApplicationsSeries(applications: Doc<"applications">[]) {
  const series = createDailySeries();
  const seriesIndex = new Map(series.map((item) => [item.date, item]));

  for (const application of applications) {
    const dayKey = formatDayKey(getUtcDayStart(application.appliedAt));
    const entry = seriesIndex.get(dayKey);

    if (entry) {
      entry.applications += 1;
    }
  }

  return series.map(({ date, label, applications: count }) => ({
    date,
    label,
    applications: count,
  }));
}

function hasReachedShortlisted(application: Doc<"applications">) {
  return application.statusHistory.some((entry) =>
    FUNNEL_SHORTLISTED_STATUSES.has(entry.status)
  );
}

function hasReachedAccepted(application: Doc<"applications">) {
  return application.statusHistory.some((entry) => entry.status === "accepted");
}

function buildMissingProfileSteps(profile: Doc<"candidateProfiles"> | null) {
  const steps: string[] = [];

  if (!profile?.headline) {
    steps.push("Add a headline");
  }

  if (!profile?.location) {
    steps.push("Set your location");
  }

  if (!profile || profile.education.length === 0) {
    steps.push("Add your education");
  }

  if (!profile || profile.skills.length === 0) {
    steps.push("List your skills");
  }

  if (!profile || profile.experience.length === 0) {
    steps.push("Add your experience");
  }

  if (
    !profile ||
    (!profile.links.github &&
      !profile.links.linkedin &&
      !profile.links.portfolio)
  ) {
    steps.push("Add at least one portfolio link");
  }

  if (!profile?.preferredCategories?.length) {
    steps.push("Choose preferred categories");
  }

  if (!profile?.preferredLocationType) {
    steps.push("Set your preferred location type");
  }

  return steps;
}

function internshipMatchesProfile(
  internship: Doc<"internships">,
  profile: Doc<"candidateProfiles"> | null
) {
  const matchesCategory =
    !profile?.preferredCategories?.length ||
    profile.preferredCategories.includes(internship.category);
  const matchesLocationType =
    !profile?.preferredLocationType ||
    profile.preferredLocationType === internship.locationType;

  return matchesCategory && matchesLocationType;
}

export const getInternshipAnalytics = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internship = await getInternshipForRecruiter(
      ctx,
      recruiter._id,
      args.internshipId
    );
    const startTimestamp = getTrendRangeStart();
    const [applications, recentApplications, recentViews] = await Promise.all([
      listInternshipApplications(ctx, internship._id),
      listRecentInternshipApplications(ctx, internship._id, startTimestamp),
      listRecentInternshipViews(ctx, internship._id, startTimestamp),
    ]);

    const totalViews = internship.viewCount;
    const totalApplications = applications.length;

    return {
      internship: {
        _id: internship._id,
        title: internship.title,
      },
      summary: {
        totalViews,
        totalApplications,
        applicationRate: calculateRate(totalApplications, totalViews),
      },
      statusBreakdown: buildStatusBreakdown(applications),
      viewsSeries: buildViewsSeries(recentViews),
      applicationsSeries: buildApplicationsSeries(recentApplications),
    };
  },
});

export const getRecruiterAnalyticsDashboard = query({
  args: {},
  handler: async (ctx) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internships = await listRecruiterInternships(ctx, recruiter._id);

    if (internships.length === 0) {
      return {
        summary: {
          totalViews: 0,
          totalApplications: 0,
          acceptanceRate: 0,
        },
        topPerformingInternships: [],
        applicationTrend: createDailySeries().map(
          ({ date, label, applications }) => ({
            date,
            label,
            applications,
          })
        ),
        categoryPerformance: INTERNSHIP_CATEGORIES.map((category) => ({
          category,
          label: toDisplayLabel(category),
          views: 0,
          applications: 0,
          acceptedApplications: 0,
          acceptanceRate: 0,
        })),
        conversionFunnel: [
          { stage: "Views", count: 0 },
          { stage: "Applications", count: 0 },
          { stage: "Shortlisted", count: 0 },
          { stage: "Accepted", count: 0 },
        ],
      };
    }

    const startTimestamp = getTrendRangeStart();
    const internshipStats = await Promise.all(
      internships.map(async (internship) => {
        const [applications, recentApplications] = await Promise.all([
          listInternshipApplications(ctx, internship._id),
          listRecentInternshipApplications(ctx, internship._id, startTimestamp),
        ]);

        const acceptedApplications = applications.filter(hasReachedAccepted);

        return {
          internship,
          applications,
          recentApplications,
          acceptedApplications,
        };
      })
    );

    const totalViews = internships.reduce(
      (sum, internship) => sum + internship.viewCount,
      0
    );
    const allApplications = internshipStats.flatMap(
      (item) => item.applications
    );
    const totalApplications = allApplications.length;
    const acceptedApplications = allApplications.filter(hasReachedAccepted);
    const shortlistedApplications = allApplications.filter(
      hasReachedShortlisted
    );

    const trendSeries = createDailySeries();
    const trendIndex = new Map(trendSeries.map((item) => [item.date, item]));

    for (const stat of internshipStats) {
      for (const application of stat.recentApplications) {
        const dayKey = formatDayKey(getUtcDayStart(application.appliedAt));
        const entry = trendIndex.get(dayKey);

        if (entry) {
          entry.applications += 1;
        }
      }
    }

    const categoryMap = new Map<
      InternshipCategory,
      {
        category: InternshipCategory;
        label: string;
        views: number;
        applications: number;
        acceptedApplications: number;
      }
    >(
      INTERNSHIP_CATEGORIES.map((category) => [
        category,
        {
          category,
          label: toDisplayLabel(category),
          views: 0,
          applications: 0,
          acceptedApplications: 0,
        },
      ])
    );

    for (const stat of internshipStats) {
      const categoryEntry = categoryMap.get(stat.internship.category);

      if (!categoryEntry) {
        continue;
      }

      categoryEntry.views += stat.internship.viewCount;
      categoryEntry.applications += stat.applications.length;
      categoryEntry.acceptedApplications += stat.acceptedApplications.length;
    }

    const topPerformingInternships = internshipStats
      .map((stat) => ({
        internshipId: stat.internship._id,
        title: stat.internship.title,
        company: stat.internship.company,
        views: stat.internship.viewCount,
        applications: stat.applications.length,
        applicationRate: calculateRate(
          stat.applications.length,
          stat.internship.viewCount
        ),
      }))
      .sort((left, right) => {
        if (right.applications !== left.applications) {
          return right.applications - left.applications;
        }

        if (right.applicationRate !== left.applicationRate) {
          return right.applicationRate - left.applicationRate;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, 5);

    return {
      summary: {
        totalViews,
        totalApplications,
        acceptanceRate: calculateRate(
          acceptedApplications.length,
          totalApplications
        ),
      },
      topPerformingInternships,
      applicationTrend: trendSeries.map(({ date, label, applications }) => ({
        date,
        label,
        applications,
      })),
      categoryPerformance: Array.from(categoryMap.values()).map((entry) => ({
        ...entry,
        acceptanceRate: calculateRate(
          entry.acceptedApplications,
          entry.applications
        ),
      })),
      conversionFunnel: [
        { stage: "Views", count: totalViews },
        { stage: "Applications", count: totalApplications },
        { stage: "Shortlisted", count: shortlistedApplications.length },
        { stage: "Accepted", count: acceptedApplications.length },
      ],
    };
  },
});

export const getRecruiterDashboardOverview = query({
  args: {},
  handler: async (ctx) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const [internships, quizzes] = await Promise.all([
      listRecruiterInternships(ctx, recruiter._id),
      listRecruiterRecruitmentQuizzes(ctx, recruiter._id),
    ]);

    if (internships.length === 0) {
      return {
        summary: {
          openListings: 0,
          draftListings: 0,
          totalApplications: 0,
          pendingQuizReviews: 0,
        },
        recentApplications: [],
        listingsNeedingAttention: [],
      };
    }

    const internshipStats = await Promise.all(
      internships.map(async (internship) => {
        const [applications, recentApplications] = await Promise.all([
          listInternshipApplications(ctx, internship._id),
          listLatestInternshipApplications(ctx, internship._id, 5),
        ]);

        return {
          internship,
          applicationCount: applications.length,
          recentApplications,
        };
      })
    );

    const pendingQuizReviews = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempts = await listSubmittedQuizAttempts(ctx, quiz._id);
        return attempts.length;
      })
    );

    const recentCandidateIds = Array.from(
      new Set(
        internshipStats.flatMap((stat) =>
          stat.recentApplications.map((application) => application.candidateId)
        )
      )
    );
    const recentCandidates = await Promise.all(
      recentCandidateIds.map(
        async (candidateId) =>
          [candidateId, await ctx.db.get(candidateId)] as const
      )
    );
    const candidateMap = new Map(recentCandidates);
    const deadlineThreshold = Date.now() + 7 * DAY_MS;

    return {
      summary: {
        openListings: internships.filter(
          (internship) => internship.status === "open"
        ).length,
        draftListings: internships.filter(
          (internship) => internship.status === "draft"
        ).length,
        totalApplications: internshipStats.reduce(
          (sum, stat) => sum + stat.applicationCount,
          0
        ),
        pendingQuizReviews: pendingQuizReviews.reduce(
          (sum, count) => sum + count,
          0
        ),
      },
      recentApplications: internshipStats
        .flatMap((stat) =>
          stat.recentApplications.map((application) => ({
            applicationId: application._id,
            internshipId: stat.internship._id,
            internshipTitle: stat.internship.title,
            candidateName:
              candidateMap.get(application.candidateId)?.name ?? "Candidate",
            status: application.status,
            appliedAt: application.appliedAt,
          }))
        )
        .sort((left, right) => right.appliedAt - left.appliedAt)
        .slice(0, 5),
      listingsNeedingAttention: internshipStats
        .filter(
          (stat) =>
            stat.internship.status === "draft" ||
            (stat.internship.status === "open" &&
              stat.internship.applicationDeadline <= deadlineThreshold)
        )
        .sort((left, right) => {
          if (
            left.internship.status === "draft" &&
            right.internship.status !== "draft"
          ) {
            return -1;
          }

          if (
            right.internship.status === "draft" &&
            left.internship.status !== "draft"
          ) {
            return 1;
          }

          return (
            left.internship.applicationDeadline -
            right.internship.applicationDeadline
          );
        })
        .map((stat) => ({
          internshipId: stat.internship._id,
          title: stat.internship.title,
          status: stat.internship.status,
          applicationDeadline: stat.internship.applicationDeadline,
          applicationCount: stat.applicationCount,
        })),
    };
  },
});

export const getCandidateDashboardOverview = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await requireRole(ctx, "candidate");
    const [profile, applications, unreadNotifications] = await Promise.all([
      ctx.db
        .query("candidateProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", candidate._id))
        .unique(),
      ctx.db
        .query("applications")
        .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_user_and_read", (q) =>
          q.eq("userId", candidate._id).eq("isRead", false)
        )
        .order("desc")
        .collect(),
    ]);

    const profileCompleteness = calculateProfileCompleteness(profile);
    const missingProfileSteps = buildMissingProfileSteps(profile);
    const internshipEntries = await Promise.all(
      Array.from(
        new Set(applications.map((application) => application.internshipId))
      ).map(
        async (internshipId) =>
          [internshipId, await ctx.db.get(internshipId)] as const
      )
    );
    const internshipMap = new Map(internshipEntries);

    const recentApplications = applications
      .slice()
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 5)
      .map((application) => {
        const internship = internshipMap.get(application.internshipId);

        return {
          applicationId: application._id,
          internshipId: application.internshipId,
          status: application.status,
          appliedAt: application.appliedAt,
          updatedAt: application.updatedAt,
          internship: internship
            ? {
                title: internship.title,
                company: internship.company,
                locationType: internship.locationType,
              }
            : null,
        };
      });

    const quizApplications = applications
      .filter((application) => application.assignedQuizId)
      .filter(
        (application) =>
          application.status === "quiz_assigned" ||
          application.status === "quiz_completed"
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);

    const pendingQuizItems = (
      await Promise.all(
        quizApplications.map(async (application) => {
          if (!application.assignedQuizId) {
            return null;
          }

          const [quiz, attempt] = await Promise.all([
            ctx.db.get(application.assignedQuizId),
            ctx.db
              .query("quizAttempts")
              .withIndex("by_application", (q) =>
                q.eq("applicationId", application._id)
              )
              .unique(),
          ]);

          if (!quiz || attempt?.status === "graded") {
            return null;
          }

          const internship = internshipMap.get(application.internshipId);

          return {
            applicationId: application._id,
            quizId: quiz._id,
            quizTitle: quiz.title,
            internshipId: application.internshipId,
            internshipTitle: internship?.title ?? "Internship unavailable",
            internshipCompany: internship?.company ?? "Unknown company",
            attemptStatus: attempt?.status ?? null,
            deadlineAt: attempt?.deadlineAt ?? null,
            quizAssignedAt: application.quizAssignedAt ?? null,
            updatedAt: application.updatedAt,
          };
        })
      )
    ).filter((item) => item !== null);

    const openInternships = await ctx.db
      .query("internships")
      .withIndex("by_status_and_deadline", (q) => q.eq("status", "open"))
      .order("asc")
      .take(50);
    const appliedInternshipIds = new Set(
      applications.map((application) => application.internshipId)
    );
    const matchingInternships: {
      internshipId: Id<"internships">;
      title: string;
      company: string;
      category: Doc<"internships">["category"];
      locationType: Doc<"internships">["locationType"];
      applicationDeadline: number;
      stipend?: number;
    }[] = [];
    const seenInternshipIds = new Set<Id<"internships">>();

    for (const internship of [
      ...openInternships.filter((entry) =>
        internshipMatchesProfile(entry, profile)
      ),
      ...openInternships,
    ]) {
      if (
        appliedInternshipIds.has(internship._id) ||
        seenInternshipIds.has(internship._id)
      ) {
        continue;
      }

      matchingInternships.push({
        internshipId: internship._id,
        title: internship.title,
        company: internship.company,
        category: internship.category,
        locationType: internship.locationType,
        applicationDeadline: internship.applicationDeadline,
        ...(internship.stipend === undefined
          ? {}
          : { stipend: internship.stipend }),
      });
      seenInternshipIds.add(internship._id);

      if (matchingInternships.length === 4) {
        break;
      }
    }

    return {
      summary: {
        profileCompleteness,
        applicationCount: applications.length,
        activePipelineCount: applications.filter((application) =>
          ACTIVE_PIPELINE_STATUSES.has(application.status as ApplicationStatus)
        ).length,
        pendingQuizCount: pendingQuizItems.length,
        unreadNotificationCount: unreadNotifications.length,
      },
      profile: {
        hasProfile: !!profile,
        missingProfileSteps,
        preferredCategories: profile?.preferredCategories ?? [],
        preferredLocationType: profile?.preferredLocationType ?? null,
      },
      applicationStatusBreakdown: buildStatusBreakdown(applications),
      recentApplications,
      pendingQuizItems: pendingQuizItems.slice(0, 3),
      unreadNotifications: unreadNotifications
        .slice(0, 3)
        .map((notification) => ({
          notificationId: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link ?? null,
          createdAt: notification.createdAt,
        })),
      matchingInternships,
    };
  },
});
