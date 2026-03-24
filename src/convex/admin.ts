import { v } from "convex/values";

import { Doc } from "@/convex/_generated/dataModel";
import { mutation, query } from "@/convex/_generated/server";
import { requireRole } from "@/convex/lib/auth";
import {
  closeInternshipByAdmin,
  suspendUserByAdmin,
  unsuspendUserByAdmin,
} from "@/convex/lib/moderation";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAY_COUNT = 7;

const USER_ROLES = ["candidate", "recruiter", "admin"] as const;
const INTERNSHIP_STATUSES = ["draft", "open", "closed"] as const;
const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
  "accepted",
  "rejected",
] as const;

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

function getTrendRangeStart() {
  return getUtcDayStart(Date.now()) - (TREND_DAY_COUNT - 1) * DAY_MS;
}

function createTrendSeries() {
  const start = getTrendRangeStart();

  return Array.from({ length: TREND_DAY_COUNT }, (_, index) => {
    const timestamp = start + index * DAY_MS;

    return {
      date: formatDayKey(timestamp),
      label: formatDayLabel(timestamp),
      applications: 0,
      internships: 0,
    };
  });
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const [users, internships, applications, reports] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("internships").collect(),
      ctx.db.query("applications").collect(),
      ctx.db.query("reports").collect(),
    ]);

    const usersByRole = Object.fromEntries(
      USER_ROLES.map((role) => [role, 0])
    ) as Record<(typeof USER_ROLES)[number], number>;
    const internshipsByStatus = Object.fromEntries(
      INTERNSHIP_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof INTERNSHIP_STATUSES)[number], number>;
    const applicationsByStatus = Object.fromEntries(
      APPLICATION_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof APPLICATION_STATUSES)[number], number>;
    const trendSeries = createTrendSeries();
    const trendMap = new Map(trendSeries.map((entry) => [entry.date, entry]));
    const trendStart = getTrendRangeStart();

    for (const user of users) {
      if (user.role) {
        usersByRole[user.role] += 1;
      }
    }

    for (const internship of internships) {
      internshipsByStatus[internship.status] += 1;

      if (internship.createdAt < trendStart) {
        continue;
      }

      const entry = trendMap.get(
        formatDayKey(getUtcDayStart(internship.createdAt))
      );
      if (entry) {
        entry.internships += 1;
      }
    }

    for (const application of applications) {
      applicationsByStatus[application.status] += 1;

      if (application.appliedAt < trendStart) {
        continue;
      }

      const entry = trendMap.get(
        formatDayKey(getUtcDayStart(application.appliedAt))
      );
      if (entry) {
        entry.applications += 1;
      }
    }

    const pendingReports = reports.filter(
      (report) => report.status === "pending"
    );
    const newApplicationsThisWeek = trendSeries.reduce(
      (sum, entry) => sum + entry.applications,
      0
    );
    const newInternshipsThisWeek = trendSeries.reduce(
      (sum, entry) => sum + entry.internships,
      0
    );

    return {
      summary: {
        totalUsers: users.length,
        totalInternships: internships.length,
        totalApplications: applications.length,
        pendingReports: pendingReports.length,
        suspendedUsers: users.filter((user) => user.isSuspended === true)
          .length,
        newApplicationsThisWeek,
        newInternshipsThisWeek,
      },
      usersByRole: USER_ROLES.map((role) => ({
        role,
        label: toDisplayLabel(role),
        count: usersByRole[role],
      })),
      internshipsByStatus: INTERNSHIP_STATUSES.map((status) => ({
        status,
        label: toDisplayLabel(status),
        count: internshipsByStatus[status],
      })),
      applicationsByStatus: APPLICATION_STATUSES.map((status) => ({
        status,
        label: toDisplayLabel(status),
        count: applicationsByStatus[status],
      })),
      trend: trendSeries,
    };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const users = await ctx.db.query("users").order("desc").collect();

    return users
      .filter((user) => user.role !== "admin")
      .map((user) => ({
        ...user,
        isSuspended: user.isSuspended === true,
      }));
  },
});

export const getUserDetail = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const user = await ctx.db.get(args.userId);

    if (!user || user.role === "admin") {
      return null;
    }

    const [candidateProfile, candidateApplications, recruiterInternships] =
      await Promise.all([
        ctx.db
          .query("candidateProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique(),
        user.role === "candidate"
          ? ctx.db
              .query("applications")
              .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
              .collect()
          : Promise.resolve([] as Doc<"applications">[]),
        user.role === "recruiter"
          ? ctx.db
              .query("internships")
              .withIndex("by_recruiter", (q) => q.eq("recruiterId", user._id))
              .collect()
          : Promise.resolve([] as Doc<"internships">[]),
      ]);

    const candidateStatusCounts = Object.fromEntries(
      APPLICATION_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof APPLICATION_STATUSES)[number], number>;

    for (const application of candidateApplications) {
      candidateStatusCounts[application.status] += 1;
    }

    const recruiterStatusCounts = Object.fromEntries(
      INTERNSHIP_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof INTERNSHIP_STATUSES)[number], number>;

    for (const internship of recruiterInternships) {
      recruiterStatusCounts[internship.status] += 1;
    }

    const recruiterInternshipIds = recruiterInternships.map(
      (internship) => internship._id
    );
    const recruiterApplications = recruiterInternshipIds.length
      ? (
          await Promise.all(
            recruiterInternshipIds.map((internshipId) =>
              ctx.db
                .query("applications")
                .withIndex("by_internship", (q) =>
                  q.eq("internshipId", internshipId)
                )
                .collect()
            )
          )
        ).flat()
      : [];

    return {
      user: {
        ...user,
        isSuspended: user.isSuspended === true,
      },
      candidateProfile: candidateProfile
        ? {
            headline: candidateProfile.headline,
            location: candidateProfile.location,
            preferredCategories: candidateProfile.preferredCategories ?? [],
            preferredLocationType: candidateProfile.preferredLocationType,
            skillsCount: candidateProfile.skills.length,
            experienceCount: candidateProfile.experience.length,
            educationCount: candidateProfile.education.length,
          }
        : null,
      activitySummary:
        user.role === "candidate"
          ? {
              kind: "candidate" as const,
              totalApplications: candidateApplications.length,
              statuses: APPLICATION_STATUSES.map((status) => ({
                status,
                label: toDisplayLabel(status),
                count: candidateStatusCounts[status],
              })),
            }
          : user.role === "recruiter"
            ? {
                kind: "recruiter" as const,
                totalInternships: recruiterInternships.length,
                totalApplications: recruiterApplications.length,
                statuses: INTERNSHIP_STATUSES.map((status) => ({
                  status,
                  label: toDisplayLabel(status),
                  count: recruiterStatusCounts[status],
                })),
              }
            : {
                kind: "candidate" as const,
                totalApplications: 0,
                statuses: APPLICATION_STATUSES.map((status) => ({
                  status,
                  label: toDisplayLabel(status),
                  count: 0,
                })),
              },
    };
  },
});

export const suspendUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    await suspendUserByAdmin(ctx, admin._id, args.userId, args.reason);
    return null;
  },
});

export const unsuspendUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    await unsuspendUserByAdmin(ctx, admin._id, args.userId);
    return null;
  },
});

export const listInternships = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const [internships, users] = await Promise.all([
      ctx.db.query("internships").order("desc").collect(),
      ctx.db.query("users").collect(),
    ]);
    const userMap = new Map(users.map((user) => [user._id, user]));

    return internships.map((internship) => {
      const recruiter = userMap.get(internship.recruiterId);

      return {
        ...internship,
        recruiter: recruiter
          ? {
              _id: recruiter._id,
              name: recruiter.name,
              email: recruiter.email,
              username: recruiter.username,
            }
          : null,
      };
    });
  },
});

export const closeInternship = mutation({
  args: {
    internshipId: v.id("internships"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    await closeInternshipByAdmin(
      ctx,
      admin._id,
      args.internshipId,
      args.reason
    );
    return null;
  },
});
