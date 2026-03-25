import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
    createdAt: now,
    updatedAt: now,
  };
}

function createInternshipSeed(
  recruiterId: Id<"users">,
  overrides?: Partial<{
    title: string;
    category:
      | "technology"
      | "business"
      | "design"
      | "marketing"
      | "finance"
      | "healthcare"
      | "other";
    viewCount: number;
    applicationDeadline: number;
  }>
) {
  const now = Date.now();

  return {
    recruiterId,
    title: overrides?.title ?? "Analytics Internship",
    company: "InternQuest",
    description: "desc",
    category: overrides?.category ?? "technology",
    location: "Kathmandu",
    locationType: "remote" as const,
    duration: "3 months",
    requirements: ["TypeScript"],
    status: "open" as const,
    applicationDeadline:
      overrides?.applicationDeadline ?? now + 10 * 24 * 60 * 60 * 1000,
    viewCount: overrides?.viewCount ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createStatusHistory(
  statuses: string[],
  changedBy: Id<"users">,
  startedAt: number
) {
  return statuses.map((status, index) => ({
    status,
    changedAt: startedAt + index * 1_000,
    changedBy,
  }));
}

describe("convex/analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restricts recruiter analytics queries to recruiters", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_analytics_auth" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    await expect(
      t.query(api.analytics.getRecruiterAnalyticsDashboard, {})
    ).rejects.toThrow("UNAUTHENTICATED");
    await expect(
      t.query(api.analytics.getRecruiterDashboardOverview, {})
    ).rejects.toThrow("UNAUTHENTICATED");

    await expect(
      t
        .withIdentity(candidateIdentity)
        .query(api.analytics.getRecruiterAnalyticsDashboard, {})
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      t
        .withIdentity(candidateIdentity)
        .query(api.analytics.getRecruiterDashboardOverview, {})
    ).rejects.toThrow("FORBIDDEN");
  });

  it("returns per-internship analytics totals, status breakdown, and 30-day trends", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_analytics_internship" };
    const candidateIds: Id<"users">[] = [];
    const seededStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );

      for (const suffix of ["a", "b", "c", "d"]) {
        candidateIds.push(
          await ctx.db.insert(
            "users",
            createUserSeed(`candidate_analytics_${suffix}`, "candidate")
          )
        );
      }

      const internshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Frontend Analytics Role",
          viewCount: 4,
        })
      );

      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerId: candidateIds[0],
        viewerKey: `user:${candidateIds[0]}`,
        viewedAt: Date.parse("2026-03-24T08:00:00.000Z"),
      });
      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerId: candidateIds[1],
        viewerKey: `user:${candidateIds[1]}`,
        viewedAt: Date.parse("2026-03-24T09:00:00.000Z"),
      });
      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerId: candidateIds[2],
        viewerKey: `user:${candidateIds[2]}`,
        viewedAt: Date.parse("2026-03-22T09:00:00.000Z"),
      });
      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerId: candidateIds[3],
        viewerKey: `user:${candidateIds[3]}`,
        viewedAt: Date.parse("2026-02-10T09:00:00.000Z"),
      });

      await ctx.db.insert("applications", {
        internshipId,
        candidateId: candidateIds[0],
        resumeStorageId: seededStorageId,
        status: "under_review",
        statusHistory: createStatusHistory(
          ["applied", "under_review"],
          recruiterId,
          Date.parse("2026-03-24T09:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-24T09:00:00.000Z"),
        updatedAt: Date.parse("2026-03-24T09:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId,
        candidateId: candidateIds[1],
        resumeStorageId: seededStorageId,
        status: "shortlisted",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted"],
          recruiterId,
          Date.parse("2026-03-22T09:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-22T09:00:00.000Z"),
        updatedAt: Date.parse("2026-03-22T09:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId,
        candidateId: candidateIds[2],
        resumeStorageId: seededStorageId,
        status: "accepted",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted", "accepted"],
          recruiterId,
          Date.parse("2026-03-20T09:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-20T09:00:00.000Z"),
        updatedAt: Date.parse("2026-03-20T09:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId,
        candidateId: candidateIds[3],
        resumeStorageId: seededStorageId,
        status: "rejected",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "rejected"],
          recruiterId,
          Date.parse("2026-02-10T09:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-02-10T09:00:00.000Z"),
        updatedAt: Date.parse("2026-02-10T09:05:00.000Z"),
      });

      return internshipId;
    });

    const result = await t
      .withIdentity(recruiterIdentity)
      .query(api.analytics.getInternshipAnalytics, {
        internshipId,
      });

    const breakdown = Object.fromEntries(
      result.statusBreakdown.map((entry) => [entry.status, entry.count])
    );
    const viewsOnMarch24 = result.viewsSeries.find(
      (entry) => entry.date === "2026-03-24"
    );
    const applicationsOnMarch24 = result.applicationsSeries.find(
      (entry) => entry.date === "2026-03-24"
    );

    expect(result.summary).toEqual({
      totalViews: 4,
      totalApplications: 4,
      applicationRate: 100,
    });
    expect(breakdown).toMatchObject({
      under_review: 1,
      shortlisted: 1,
      accepted: 1,
      rejected: 1,
    });
    expect(
      result.viewsSeries.reduce((sum, entry) => sum + entry.views, 0)
    ).toBe(3);
    expect(
      result.applicationsSeries.reduce(
        (sum, entry) => sum + entry.applications,
        0
      )
    ).toBe(3);
    expect(viewsOnMarch24?.views).toBe(2);
    expect(applicationsOnMarch24?.applications).toBe(1);
  });

  it("returns dashboard aggregates, category comparisons, and milestone funnel data", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_analytics_dashboard" };
    const seededStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );

      const candidates = await Promise.all(
        ["1", "2", "3", "4", "5"].map((suffix) =>
          ctx.db.insert(
            "users",
            createUserSeed(`candidate_dashboard_${suffix}`, "candidate")
          )
        )
      );

      const technologyInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Platform Engineering Intern",
          category: "technology",
          viewCount: 10,
        })
      );
      const designInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Product Design Intern",
          category: "design",
          viewCount: 4,
        })
      );

      await ctx.db.insert("applications", {
        internshipId: technologyInternshipId,
        candidateId: candidates[0],
        resumeStorageId: seededStorageId,
        status: "under_review",
        statusHistory: createStatusHistory(
          ["applied", "under_review"],
          recruiterId,
          Date.parse("2026-03-24T10:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-24T10:00:00.000Z"),
        updatedAt: Date.parse("2026-03-24T10:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId: technologyInternshipId,
        candidateId: candidates[1],
        resumeStorageId: seededStorageId,
        status: "quiz_assigned",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted", "quiz_assigned"],
          recruiterId,
          Date.parse("2026-03-22T10:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-22T10:00:00.000Z"),
        updatedAt: Date.parse("2026-03-22T10:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId: technologyInternshipId,
        candidateId: candidates[2],
        resumeStorageId: seededStorageId,
        status: "accepted",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted", "accepted"],
          recruiterId,
          Date.parse("2026-02-10T10:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-02-10T10:00:00.000Z"),
        updatedAt: Date.parse("2026-02-10T10:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId: designInternshipId,
        candidateId: candidates[3],
        resumeStorageId: seededStorageId,
        status: "accepted",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted", "accepted"],
          recruiterId,
          Date.parse("2026-03-20T10:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        updatedAt: Date.parse("2026-03-20T10:05:00.000Z"),
      });
      await ctx.db.insert("applications", {
        internshipId: designInternshipId,
        candidateId: candidates[4],
        resumeStorageId: seededStorageId,
        status: "rejected",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "rejected"],
          recruiterId,
          Date.parse("2026-03-18T10:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-18T10:00:00.000Z"),
        updatedAt: Date.parse("2026-03-18T10:05:00.000Z"),
      });
    });

    const result = await t
      .withIdentity(recruiterIdentity)
      .query(api.analytics.getRecruiterAnalyticsDashboard, {});

    const funnel = Object.fromEntries(
      result.conversionFunnel.map((entry) => [entry.stage, entry.count])
    );
    const categoryPerformance = Object.fromEntries(
      result.categoryPerformance.map((entry) => [entry.category, entry])
    );

    expect(result.summary).toEqual({
      totalViews: 14,
      totalApplications: 5,
      acceptanceRate: 40,
    });
    expect(result.topPerformingInternships[0]).toMatchObject({
      title: "Platform Engineering Intern",
      applications: 3,
    });
    expect(
      result.applicationTrend.reduce(
        (sum, entry) => sum + entry.applications,
        0
      )
    ).toBe(4);
    expect(categoryPerformance.technology).toMatchObject({
      views: 10,
      applications: 3,
      acceptedApplications: 1,
      acceptanceRate: 33.3,
    });
    expect(categoryPerformance.design).toMatchObject({
      views: 4,
      applications: 2,
      acceptedApplications: 1,
      acceptanceRate: 50,
    });
    expect(funnel).toEqual({
      Views: 14,
      Applications: 5,
      Shortlisted: 3,
      Accepted: 2,
    });
  });

  it("reflects deduplicated anonymous and signed-in views in recruiter dashboard totals", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "recruiter_analytics_owner" };
    const candidateIdentity = { subject: "candidate_analytics_viewer" };
    const recruiterViewerIdentity = { subject: "recruiter_analytics_viewer" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(ownerIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterViewerIdentity.subject, "recruiter")
      );

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Deduped Analytics Role",
        })
      );
    });

    await t.mutation(api.internships.trackView, {
      internshipId,
      viewerKey: "anon-viewer-1",
    });
    await t.mutation(api.internships.trackView, {
      internshipId,
      viewerKey: "anon-viewer-1",
    });
    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internships.trackView, { internshipId });
    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internships.trackView, { internshipId });
    await t
      .withIdentity(recruiterViewerIdentity)
      .mutation(api.internships.trackView, { internshipId });
    await t
      .withIdentity(ownerIdentity)
      .mutation(api.internships.trackView, { internshipId });

    const result = await t
      .withIdentity(ownerIdentity)
      .query(api.analytics.getRecruiterAnalyticsDashboard, {});

    expect(result.summary.totalViews).toBe(3);
    expect(
      result.conversionFunnel.find((entry) => entry.stage === "Views")?.count
    ).toBe(3);
  });

  it("returns recruiter dashboard overview cards, recent applications, and review counts", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_dashboard_overview" };
    const seededStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const seededIds = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      const candidates = await Promise.all(
        ["a", "b", "c", "d"].map((suffix) =>
          ctx.db.insert(
            "users",
            createUserSeed(`candidate_overview_${suffix}`, "candidate")
          )
        )
      );

      const urgentInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Urgent Product Internship",
          viewCount: 12,
          applicationDeadline: Date.parse("2026-03-27T12:00:00.000Z"),
        })
      );
      const stableInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Stable Data Internship",
          viewCount: 7,
          applicationDeadline: Date.parse("2026-04-18T12:00:00.000Z"),
        })
      );
      const draftInternshipId = await ctx.db.insert("internships", {
        ...createInternshipSeed(recruiterId, {
          title: "Draft Ops Internship",
          viewCount: 0,
          applicationDeadline: Date.parse("2026-04-02T12:00:00.000Z"),
        }),
        status: "draft",
      });

      const urgentApplicationId = await ctx.db.insert("applications", {
        internshipId: urgentInternshipId,
        candidateId: candidates[0],
        resumeStorageId: seededStorageId,
        status: "under_review",
        statusHistory: createStatusHistory(
          ["applied", "under_review"],
          recruiterId,
          Date.parse("2026-03-24T11:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-24T11:00:00.000Z"),
        updatedAt: Date.parse("2026-03-24T11:05:00.000Z"),
      });
      const stableApplicationId = await ctx.db.insert("applications", {
        internshipId: stableInternshipId,
        candidateId: candidates[1],
        resumeStorageId: seededStorageId,
        status: "quiz_assigned",
        statusHistory: createStatusHistory(
          ["applied", "under_review", "shortlisted", "quiz_assigned"],
          recruiterId,
          Date.parse("2026-03-24T09:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-24T09:00:00.000Z"),
        updatedAt: Date.parse("2026-03-24T09:05:00.000Z"),
      });
      const earlierApplicationId = await ctx.db.insert("applications", {
        internshipId: urgentInternshipId,
        candidateId: candidates[2],
        resumeStorageId: seededStorageId,
        status: "quiz_completed",
        statusHistory: createStatusHistory(
          [
            "applied",
            "under_review",
            "shortlisted",
            "quiz_assigned",
            "quiz_completed",
          ],
          recruiterId,
          Date.parse("2026-03-23T08:00:00.000Z")
        ),
        appliedAt: Date.parse("2026-03-23T08:00:00.000Z"),
        updatedAt: Date.parse("2026-03-23T08:05:00.000Z"),
      });

      const quizId = await ctx.db.insert("quizzes", {
        creatorId: recruiterId,
        title: "Manual review quiz",
        description: "Needs recruiter grading",
        type: "recruitment",
        internshipId: stableInternshipId,
        timeLimit: 20,
        questions: [
          {
            id: "q1",
            type: "short_answer",
            question: "Explain event bubbling.",
            points: 5,
            sampleAnswer: "Events move up the DOM tree.",
          },
        ],
        isPublished: true,
        publishedAt: Date.parse("2026-03-20T12:00:00.000Z"),
        createdAt: Date.parse("2026-03-20T12:00:00.000Z"),
        updatedAt: Date.parse("2026-03-20T12:00:00.000Z"),
      });

      await ctx.db.insert("quizAttempts", {
        quizId,
        candidateId: candidates[1],
        applicationId: stableApplicationId,
        attemptType: "application",
        answers: [
          {
            questionId: "q1",
            type: "short_answer",
            textAnswer: "The event bubbles from child to parent.",
          },
        ],
        maxScore: 5,
        startedAt: Date.parse("2026-03-24T09:10:00.000Z"),
        submittedAt: Date.parse("2026-03-24T09:25:00.000Z"),
        timeLimit: 20,
        status: "submitted",
      });
      await ctx.db.insert("quizAttempts", {
        quizId,
        candidateId: candidates[2],
        applicationId: earlierApplicationId,
        attemptType: "application",
        answers: [
          {
            questionId: "q1",
            type: "short_answer",
            textAnswer: "Events bubble unless they are stopped.",
          },
        ],
        maxScore: 5,
        startedAt: Date.parse("2026-03-23T08:10:00.000Z"),
        submittedAt: Date.parse("2026-03-23T08:25:00.000Z"),
        timeLimit: 20,
        status: "submitted",
      });

      return {
        draftInternshipId,
        urgentApplicationId,
        stableApplicationId,
        earlierApplicationId,
      };
    });

    const result = await t
      .withIdentity(recruiterIdentity)
      .query(api.analytics.getRecruiterDashboardOverview, {});

    expect(result.summary).toEqual({
      openListings: 2,
      draftListings: 1,
      totalApplications: 3,
      pendingQuizReviews: 2,
    });
    expect(
      result.recentApplications.map((application) => application.applicationId)
    ).toEqual([
      seededIds.urgentApplicationId,
      seededIds.stableApplicationId,
      seededIds.earlierApplicationId,
    ]);
    expect(result.recentApplications[0]).toMatchObject({
      internshipTitle: "Urgent Product Internship",
      candidateName: "candidate_overview_a name",
      status: "under_review",
    });
    expect(result.listingsNeedingAttention).toHaveLength(2);
    expect(result.listingsNeedingAttention[0]).toMatchObject({
      internshipId: seededIds.draftInternshipId,
      title: "Draft Ops Internship",
      status: "draft",
      applicationCount: 0,
    });
    expect(result.listingsNeedingAttention[1]).toMatchObject({
      title: "Urgent Product Internship",
      status: "open",
      applicationCount: 2,
    });
  });
});
