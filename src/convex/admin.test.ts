import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createUserSeed(
  clerkId: string,
  role: "candidate" | "recruiter" | "admin"
) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: `${clerkId} name`,
    email: `${clerkId}@example.com`,
    role,
    onboardingComplete: true,
    isSuspended: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createInternshipSeed(
  recruiterId: Id<"users">,
  overrides?: Partial<{
    title: string;
    status: "draft" | "open" | "closed";
    createdAt: number;
  }>
) {
  const now = overrides?.createdAt ?? Date.now();

  return {
    recruiterId,
    title: overrides?.title ?? "Moderation Internship",
    company: "InternQuest",
    description: "desc",
    category: "technology" as const,
    location: "Kathmandu",
    locationType: "remote" as const,
    duration: "3 months",
    requirements: ["TypeScript"],
    status: overrides?.status ?? "open",
    applicationDeadline: now + 10 * 24 * 60 * 60 * 1000,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/admin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restricts admin queries to admins", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_admin_guard" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    await expect(t.query(api.admin.getDashboard, {})).rejects.toThrow(
      "UNAUTHENTICATED"
    );
    await expect(
      t.withIdentity(candidateIdentity).query(api.admin.getDashboard, {})
    ).rejects.toThrow("FORBIDDEN");
  });

  it("returns admin dashboard aggregates and trends", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_dashboard_owner" };
    const seededStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    await t.run(async (ctx) => {
      const adminId = await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed("recruiter_dashboard_seed", "recruiter")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createUserSeed("candidate_dashboard_seed", "candidate")
      );

      await ctx.db.insert("users", {
        ...createUserSeed("candidate_dashboard_suspended", "candidate"),
        isSuspended: true,
      });

      const openInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Open Internship",
          status: "open",
          createdAt: Date.parse("2026-03-24T08:00:00.000Z"),
        })
      );
      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Draft Internship",
          status: "draft",
          createdAt: Date.parse("2026-03-22T08:00:00.000Z"),
        })
      );

      await ctx.db.insert("applications", {
        internshipId: openInternshipId,
        candidateId,
        resumeStorageId: seededStorageId,
        status: "applied",
        statusHistory: [
          {
            status: "applied",
            changedAt: Date.parse("2026-03-24T09:00:00.000Z"),
            changedBy: recruiterId,
          },
        ],
        appliedAt: Date.parse("2026-03-24T09:00:00.000Z"),
        updatedAt: Date.parse("2026-03-24T09:05:00.000Z"),
      });

      await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "internship",
        targetId: openInternshipId,
        reason: "spam",
        status: "pending",
        createdAt: Date.parse("2026-03-24T10:00:00.000Z"),
      });
      await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "internship",
        targetId: openInternshipId,
        reason: "other",
        status: "resolved",
        reviewedBy: adminId,
        reviewedAt: Date.parse("2026-03-24T11:00:00.000Z"),
        actionType: "close_internship",
        actionSummary: "Close Internship",
        createdAt: Date.parse("2026-03-23T10:00:00.000Z"),
      });
    });

    const result = await t
      .withIdentity(adminIdentity)
      .query(api.admin.getDashboard, {});

    expect(result.summary).toMatchObject({
      totalUsers: 4,
      totalInternships: 2,
      totalApplications: 1,
      pendingReports: 1,
      suspendedUsers: 1,
      newApplicationsThisWeek: 1,
      newInternshipsThisWeek: 2,
    });
    expect(
      result.usersByRole.find((entry) => entry.role === "candidate")?.count
    ).toBe(2);
    expect(
      result.internshipsByStatus.find((entry) => entry.status === "open")?.count
    ).toBe(1);
    expect(
      result.trend.find((entry) => entry.date === "2026-03-24")
    ).toMatchObject({
      applications: 1,
      internships: 1,
    });
  });

  it("omits admin accounts from user management data", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_user_list_owner" };

    const [adminId, candidateId] = await t.run(async (ctx) => {
      const createdAdminId = await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      const createdCandidateId = await ctx.db.insert(
        "users",
        createUserSeed("candidate_user_list_target", "candidate")
      );

      return [createdAdminId, createdCandidateId];
    });

    const users = await t
      .withIdentity(adminIdentity)
      .query(api.admin.listUsers, {});

    expect(users.map((user) => user._id)).toEqual([candidateId]);

    await expect(
      t.withIdentity(adminIdentity).query(api.admin.getUserDetail, {
        userId: adminId,
      })
    ).resolves.toBeNull();
  });

  it("suspends and unsuspends users while protecting admin accounts", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_suspend_owner" };
    const candidateIdentity = { subject: "candidate_suspend_target" };
    const suspensionReason = "Repeatedly ignored moderation guidance.";

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    await t.withIdentity(adminIdentity).mutation(api.admin.suspendUser, {
      userId: (await t
        .withIdentity(candidateIdentity)
        .query(api.users.current, {}))!._id,
      reason: suspensionReason,
    });

    await expect(
      t.withIdentity(adminIdentity).query(api.admin.listUsers, {})
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clerkId: candidateIdentity.subject,
          isSuspended: true,
          suspensionReason,
        }),
      ])
    );

    await expect(
      t.withIdentity(candidateIdentity).query(api.candidateProfiles.current, {})
    ).rejects.toThrow("ACCOUNT_SUSPENDED");

    await expect(
      t.withIdentity(adminIdentity).mutation(api.admin.suspendUser, {
        userId: (await t
          .withIdentity(adminIdentity)
          .query(api.users.current, {}))!._id,
      })
    ).rejects.toThrow("Admin accounts cannot be suspended");

    await t.withIdentity(adminIdentity).mutation(api.admin.unsuspendUser, {
      userId: (await t
        .withIdentity(candidateIdentity)
        .query(api.users.current, {}))!._id,
    });

    await expect(
      t.withIdentity(candidateIdentity).query(api.candidateProfiles.current, {})
    ).resolves.toBeNull();
  });

  it("closes internships through admin moderation and blocks recruiter updates", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_close_owner" };
    const recruiterIdentity = { subject: "recruiter_close_target" };

    const internshipId = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );

      expect(adminId).toBeTruthy();

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Lockable Internship",
        })
      );
    });

    await t.withIdentity(adminIdentity).mutation(api.admin.closeInternship, {
      internshipId,
    });

    await expect(
      t.withIdentity(recruiterIdentity).mutation(api.internships.updateStatus, {
        internshipId,
        status: "open",
      })
    ).rejects.toThrow("closed by an admin");

    await expect(
      t.query(api.internships.getPublic, {
        internshipId,
      })
    ).resolves.toBeNull();
  });
});
