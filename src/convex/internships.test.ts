import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createTestUser(
  clerkId: string,
  role?: "candidate" | "recruiter" | "admin"
) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: "Test User",
    email: `${clerkId}@example.com`,
    onboardingComplete: role !== undefined,
    createdAt: now,
    updatedAt: now,
    ...(role ? { role } : {}),
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
    locationType: "remote" | "onsite" | "hybrid";
    stipend: number;
    status: "draft" | "open" | "closed";
    applicationDeadline: number;
    createdAt: number;
  }>
) {
  const now = Date.now();

  return {
    recruiterId,
    title: overrides?.title ?? "Software Internship",
    company: "InternQuest",
    description: "Great internship",
    category: overrides?.category ?? "technology",
    location: "Kathmandu",
    locationType: overrides?.locationType ?? "remote",
    duration: "3 months",
    stipend: overrides?.stipend,
    requirements: ["TypeScript"],
    status: overrides?.status ?? "open",
    applicationDeadline:
      overrides?.applicationDeadline ?? now + 10 * 24 * 60 * 60 * 1000,
    maxApplications: 20,
    viewCount: 0,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: now,
  };
}

function createRecruitmentQuizSeed(
  creatorId: Id<"users">,
  internshipId: Id<"internships">
) {
  const now = Date.now();

  return {
    creatorId,
    title: "Screening Quiz",
    type: "recruitment" as const,
    internshipId,
    questions: [
      {
        id: "question-1",
        type: "multiple_choice" as const,
        question: "What is TypeScript?",
        points: 1,
        options: [
          { id: "option-a", text: "A superset of JavaScript" },
          { id: "option-b", text: "A database" },
        ],
        correctOptionId: "option-a",
      },
    ],
    isPublished: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/internships", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects internship creation for unauthenticated users", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.internships.create, {
        title: "Frontend Intern",
        company: "Acme",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "remote",
        duration: "3 months",
        requirements: ["React"],
        status: "draft",
        applicationDeadline: Date.now() + 86_400_000,
      })
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("rejects internship creation for non-recruiters", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "candidate_1" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "candidate")
      );
    });

    await expect(
      t.withIdentity(identity).mutation(api.internships.create, {
        title: "Frontend Intern",
        company: "Acme",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "remote",
        duration: "3 months",
        requirements: ["React"],
        status: "draft",
        applicationDeadline: Date.now() + 86_400_000,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("creates an internship for recruiters and trims string fields", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "recruiter_1" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "recruiter")
      );
    });

    const internshipId = await t
      .withIdentity(identity)
      .mutation(api.internships.create, {
        title: "  Frontend Intern  ",
        company: "  Acme  ",
        description: "desc",
        category: "technology",
        location: "  Kathmandu  ",
        locationType: "remote",
        duration: " 3 months ",
        stipend: 500,
        requirements: [" React ", " TypeScript "],
        status: "open",
        applicationDeadline: Date.now() + 86_400_000,
        maxApplications: 10,
      });

    const created = await t
      .withIdentity(identity)
      .query(api.internships.getForRecruiter, {
        internshipId,
      });

    expect(created).not.toBeNull();
    expect(created?.title).toBe("Frontend Intern");
    expect(created?.company).toBe("Acme");
    expect(created?.location).toBe("Kathmandu");
    expect(created?.duration).toBe("3 months");
    expect(created?.requirements).toEqual(["React", "TypeScript"]);
    expect(created?.viewCount).toBe(0);
  });

  it("rejects create and update when deadline is not in the future", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "recruiter_2" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "recruiter")
      );
    });

    await expect(
      t.withIdentity(identity).mutation(api.internships.create, {
        title: "Frontend Intern",
        company: "Acme",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "remote",
        duration: "3 months",
        requirements: ["React"],
        status: "draft",
        applicationDeadline: Date.now() - 1,
      })
    ).rejects.toThrow("Application deadline must be in the future");

    const internshipId = await t
      .withIdentity(identity)
      .mutation(api.internships.create, {
        title: "Backend Intern",
        company: "Acme",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "onsite",
        duration: "3 months",
        requirements: ["Node"],
        status: "draft",
        applicationDeadline: Date.now() + 86_400_000,
      });

    await expect(
      t.withIdentity(identity).mutation(api.internships.update, {
        internshipId,
        title: "Backend Intern",
        company: "Acme",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "onsite",
        duration: "3 months",
        requirements: ["Node"],
        status: "draft",
        applicationDeadline: Date.now() - 1,
      })
    ).rejects.toThrow("Application deadline must be in the future");
  });

  it("allows recruiter to update own listing and blocks other recruiters", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "recruiter_owner" };
    const otherIdentity = { subject: "recruiter_other" };

    const internshipId = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert(
        "users",
        createTestUser(ownerIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createTestUser(otherIdentity.subject, "recruiter")
      );

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(ownerId, {
          title: "Original Title",
          status: "draft",
        })
      );
    });

    await t.withIdentity(ownerIdentity).mutation(api.internships.update, {
      internshipId,
      title: "Updated Title",
      company: "Updated Co",
      description: "updated",
      category: "business",
      location: "Pokhara",
      locationType: "hybrid",
      duration: "6 months",
      stipend: 600,
      requirements: ["Communication"],
      status: "open",
      applicationDeadline: Date.now() + 2 * 86_400_000,
      maxApplications: 30,
    });

    const updated = await t
      .withIdentity(ownerIdentity)
      .query(api.internships.getForRecruiter, {
        internshipId,
      });

    expect(updated?.title).toBe("Updated Title");
    expect(updated?.status).toBe("open");
    expect(updated?.category).toBe("business");

    await expect(
      t.withIdentity(otherIdentity).mutation(api.internships.updateStatus, {
        internshipId,
        status: "closed",
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("returns delete metadata for a deletable recruiter listing", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "recruiter_delete_state" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "recruiter")
      );

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, { status: "draft" })
      );
    });

    const internship = await t
      .withIdentity(identity)
      .query(api.internships.getForRecruiter, {
        internshipId,
      });

    expect(internship?.canDelete).toBe(true);
    expect(internship?.deleteDisabledReason).toBeNull();
  });

  it("blocks deleting recruiter listings that already have applications", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_delete_blocked" };
    const candidateIdentity = { subject: "candidate_delete_blocked" };
    const resumeStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser(recruiterIdentity.subject, "recruiter")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createTestUser(candidateIdentity.subject, "candidate")
      );
      const internshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, { status: "open" })
      );

      await ctx.db.insert("applications", {
        internshipId,
        candidateId,
        resumeStorageId,
        status: "applied",
        statusHistory: [
          {
            status: "applied",
            changedAt: Date.now(),
            changedBy: candidateIdentity.subject,
          },
        ],
        appliedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return internshipId;
    });

    const internship = await t
      .withIdentity(recruiterIdentity)
      .query(api.internships.getForRecruiter, {
        internshipId,
      });

    expect(internship?.canDelete).toBe(false);
    expect(internship?.deleteDisabledReason).toContain("applications");

    await expect(
      t.withIdentity(recruiterIdentity).mutation(api.internships.remove, {
        internshipId,
      })
    ).rejects.toThrow("applications");
  });

  it("blocks deleting recruiter listings that are still linked to a quiz", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "recruiter_delete_linked_quiz" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "recruiter")
      );
      const internshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, { status: "draft" })
      );

      await ctx.db.insert(
        "quizzes",
        createRecruitmentQuizSeed(recruiterId, internshipId)
      );

      return internshipId;
    });

    const internship = await t
      .withIdentity(identity)
      .query(api.internships.getForRecruiter, {
        internshipId,
      });

    expect(internship?.canDelete).toBe(false);
    expect(internship?.deleteDisabledReason).toContain("recruitment quiz");

    await expect(
      t.withIdentity(identity).mutation(api.internships.remove, {
        internshipId,
      })
    ).rejects.toThrow("recruitment quiz");
  });

  it("deletes a recruiter listing and removes related views and reports", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_delete_success" };
    const candidateIdentity = { subject: "candidate_reporter" };

    const { internshipId, unrelatedReportId } = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser(recruiterIdentity.subject, "recruiter")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createTestUser(candidateIdentity.subject, "candidate")
      );
      const internshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, { status: "draft" })
      );

      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerId: candidateId,
        viewerKey: `user:${candidateId}`,
        viewedAt: Date.now(),
      });
      await ctx.db.insert("internshipViews", {
        internshipId,
        viewerKey: "anon-browser",
        viewedAt: Date.now(),
      });

      await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "internship",
        targetId: internshipId,
        reason: "spam",
        status: "pending",
        createdAt: Date.now(),
      });
      const unrelatedReportId = await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "user",
        targetId: candidateId,
        reason: "spam",
        status: "pending",
        createdAt: Date.now(),
      });

      return { internshipId, unrelatedReportId };
    });

    await t.withIdentity(recruiterIdentity).mutation(api.internships.remove, {
      internshipId,
    });

    const snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(internshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) => q.eq("internshipId", internshipId))
        .collect();
      const internshipReports = (
        await ctx.db
          .query("reports")
          .withIndex("by_targetType", (q) => q.eq("targetType", "internship"))
          .collect()
      ).filter((report) => report.targetId === internshipId);
      const unrelatedReport = await ctx.db.get(unrelatedReportId);

      return { internship, views, internshipReports, unrelatedReport };
    });

    expect(snapshot.internship).toBeNull();
    expect(snapshot.views).toHaveLength(0);
    expect(snapshot.internshipReports).toHaveLength(0);
    expect(snapshot.unrelatedReport).not.toBeNull();
  });

  it("blocks deleting listings for non-owners and non-recruiters", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "recruiter_delete_owner" };
    const otherRecruiterIdentity = { subject: "recruiter_delete_other" };
    const candidateIdentity = { subject: "candidate_delete_other" };

    const internshipId = await t.run(async (ctx) => {
      const ownerId = await ctx.db.insert(
        "users",
        createTestUser(ownerIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createTestUser(otherRecruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createTestUser(candidateIdentity.subject, "candidate")
      );

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(ownerId, { status: "draft" })
      );
    });

    await expect(
      t
        .withIdentity(otherRecruiterIdentity)
        .mutation(api.internships.remove, { internshipId })
    ).rejects.toThrow("FORBIDDEN");

    await expect(
      t.withIdentity(candidateIdentity).mutation(api.internships.remove, {
        internshipId,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("lists only open internships publicly with filters and sorting", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser("recruiter_list", "recruiter")
      );

      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Open Technology Remote",
          category: "technology",
          locationType: "remote",
          status: "open",
          applicationDeadline: Date.now() + 86_400_000,
          stipend: 700,
        })
      );

      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Open Business Onsite",
          category: "business",
          locationType: "onsite",
          status: "open",
          applicationDeadline: Date.now() + 2 * 86_400_000,
          stipend: 400,
        })
      );

      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Draft Technology Remote",
          category: "technology",
          locationType: "remote",
          status: "draft",
          applicationDeadline: Date.now() + 3 * 86_400_000,
          stipend: 900,
        })
      );
    });

    const allOpen = await t.query(api.internships.listPublic, {
      category: undefined,
      locationType: undefined,
      sortBy: "newest",
      paginationOpts: { numItems: 20, cursor: null },
    });

    expect(allOpen.page.map((item) => item.title).sort()).toEqual([
      "Open Business Onsite",
      "Open Technology Remote",
    ]);

    const technologyRemote = await t.query(api.internships.listPublic, {
      category: "technology",
      locationType: "remote",
      sortBy: "newest",
      paginationOpts: { numItems: 20, cursor: null },
    });

    expect(technologyRemote.page).toHaveLength(1);
    expect(technologyRemote.page[0]?.title).toBe("Open Technology Remote");

    const stipendSorted = await t.query(api.internships.listPublic, {
      category: undefined,
      locationType: undefined,
      sortBy: "stipend",
      paginationOpts: { numItems: 20, cursor: null },
    });

    expect(stipendSorted.page.map((item) => item.title)).toEqual([
      "Open Technology Remote",
      "Open Business Onsite",
    ]);
  });

  it("returns empty results for blank search and matches open listings by title", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createTestUser("recruiter_search", "recruiter")
      );

      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Frontend Engineering Internship",
          status: "open",
        })
      );
      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Backend Platform Internship",
          status: "open",
        })
      );
      await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Frontend Draft Role",
          status: "draft",
        })
      );
    });

    const blank = await t.query(api.internships.searchPublic, {
      query: "   ",
      category: undefined,
      locationType: undefined,
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(blank.page).toEqual([]);
    expect(blank.isDone).toBe(true);

    const results = await t.query(api.internships.searchPublic, {
      query: "frontend",
      category: undefined,
      locationType: undefined,
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(results.page).toHaveLength(1);
    expect(results.page[0]?.title).toBe("Frontend Engineering Internship");
  });

  it("tracks anonymous and signed-in public views, excludes owners, and deduplicates within one hour", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_viewer" };
    const recruiterIdentity = { subject: "recruiter_viewer" };
    const ownerIdentity = { subject: "recruiter_views" };

    const { openInternshipId, closedInternshipId } = await t.run(
      async (ctx) => {
        const recruiterId = await ctx.db.insert(
          "users",
          createTestUser(ownerIdentity.subject, "recruiter")
        );
        await ctx.db.insert(
          "users",
          createTestUser(candidateIdentity.subject, "candidate")
        );
        await ctx.db.insert(
          "users",
          createTestUser(recruiterIdentity.subject, "recruiter")
        );

        const openInternshipId = await ctx.db.insert(
          "internships",
          createInternshipSeed(recruiterId, {
            status: "open",
            title: "Track Me",
          })
        );
        const closedInternshipId = await ctx.db.insert(
          "internships",
          createInternshipSeed(recruiterId, {
            status: "closed",
            title: "Do Not Track",
          })
        );

        return { openInternshipId, closedInternshipId };
      }
    );

    vi.setSystemTime(new Date("2026-03-13T00:00:00.000Z"));

    await t.mutation(api.internships.trackView, {
      internshipId: openInternshipId,
      viewerKey: "anon-browser-1",
    });
    await t.mutation(api.internships.trackView, {
      internshipId: openInternshipId,
      viewerKey: "anon-browser-1",
    });

    let snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(openInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", openInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(snapshot.internship?.viewCount).toBe(1);
    expect(snapshot.viewsCount).toBe(1);

    await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internships.trackView, {
        internshipId: openInternshipId,
        viewerKey: "ignored-for-signed-in-users",
      });

    snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(openInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", openInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(snapshot.internship?.viewCount).toBe(2);
    expect(snapshot.viewsCount).toBe(2);

    await t.withIdentity(ownerIdentity).mutation(api.internships.trackView, {
      internshipId: openInternshipId,
    });

    snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(openInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", openInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(snapshot.internship?.viewCount).toBe(2);
    expect(snapshot.viewsCount).toBe(2);

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internships.trackView, {
        internshipId: openInternshipId,
      });
    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internships.trackView, {
        internshipId: openInternshipId,
      });

    snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(openInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", openInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(snapshot.internship?.viewCount).toBe(3);
    expect(snapshot.viewsCount).toBe(3);

    vi.setSystemTime(new Date("2026-03-13T01:01:00.000Z"));

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internships.trackView, {
        internshipId: openInternshipId,
      });

    snapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(openInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", openInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(snapshot.internship?.viewCount).toBe(4);
    expect(snapshot.viewsCount).toBe(4);

    await t.mutation(api.internships.trackView, {
      internshipId: closedInternshipId,
      viewerKey: "anon-browser-1",
    });

    const closedSnapshot = await t.run(async (ctx) => {
      const internship = await ctx.db.get(closedInternshipId);
      const views = await ctx.db
        .query("internshipViews")
        .withIndex("by_internship", (q) =>
          q.eq("internshipId", closedInternshipId)
        )
        .collect();

      return { internship, viewsCount: views.length };
    });

    expect(closedSnapshot.internship?.viewCount).toBe(0);
    expect(closedSnapshot.viewsCount).toBe(0);
  });
});
