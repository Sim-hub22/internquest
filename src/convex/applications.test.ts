import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

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

describe("convex/applications", () => {
  it("rejects unauthenticated status updates", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_status_unauth" };
    const candidateIdentity = { subject: "candidate_status_unauth" };
    const seededStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const applicationId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
      const internshipId = await ctx.db.insert("internships", {
        recruiterId,
        title: "Frontend Intern",
        company: "InternQuest",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "remote",
        duration: "3 months",
        requirements: ["React"],
        status: "open",
        applicationDeadline: Date.now() + 86_400_000,
        viewCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return await ctx.db.insert("applications", {
        internshipId,
        candidateId,
        resumeStorageId: seededStorageId,
        status: "applied",
        statusHistory: [
          {
            status: "applied",
            changedAt: Date.now(),
            changedBy: candidateId,
          },
        ],
        appliedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.applications.updateStatus, {
        applicationId,
        status: "under_review",
      })
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("creates application from candidate, blocks duplicate apply, and supports recruiter status updates", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_apply_1" };
    const candidateIdentity = { subject: "candidate_apply_1" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );

      return await ctx.db.insert("internships", {
        recruiterId,
        title: "Backend Intern",
        company: "InternQuest",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "remote",
        duration: "3 months",
        requirements: ["Node.js"],
        status: "open",
        applicationDeadline: Date.now() + 86_400_000,
        viewCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const resumeStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const applicationId = await t
      .withIdentity(candidateIdentity)
      .mutation(api.applications.apply, {
        internshipId,
        resumeStorageId,
        coverLetter: "  Ready to contribute from day one.  ",
      });

    const candidateView = await t
      .withIdentity(candidateIdentity)
      .query(api.applications.getForCandidate, {
        applicationId,
      });

    expect(candidateView?.status).toBe("applied");
    expect(candidateView?.coverLetter).toBe(
      "Ready to contribute from day one."
    );

    const secondResumeStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    await expect(
      t.withIdentity(candidateIdentity).mutation(api.applications.apply, {
        internshipId,
        resumeStorageId: secondResumeStorageId,
      })
    ).rejects.toThrow("You have already applied to this internship");

    await t
      .withIdentity(recruiterIdentity)
      .mutation(api.applications.updateStatus, {
        applicationId,
        status: "under_review",
      });

    const updatedForCandidate = await t
      .withIdentity(candidateIdentity)
      .query(api.applications.getForCandidate, {
        applicationId,
      });

    expect(updatedForCandidate?.status).toBe("under_review");
    expect(updatedForCandidate?.statusHistory.length).toBe(2);

    const notifications = await t
      .withIdentity(candidateIdentity)
      .query(api.notifications.listUnread, {});

    expect(
      notifications.some((item) => item.type === "application_status")
    ).toBe(true);
  });

  it("enforces status transition and authorization rules", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_apply_2" };
    const candidateIdentity = { subject: "candidate_apply_2" };
    const otherRecruiterIdentity = { subject: "recruiter_apply_3" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(otherRecruiterIdentity.subject, "recruiter")
      );

      return await ctx.db.insert("internships", {
        recruiterId,
        title: "Security Intern",
        company: "InternQuest",
        description: "desc",
        category: "technology",
        location: "Kathmandu",
        locationType: "hybrid",
        duration: "6 months",
        requirements: ["Security fundamentals"],
        status: "open",
        applicationDeadline: Date.now() + 86_400_000,
        viewCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const validStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const applicationId = await t
      .withIdentity(candidateIdentity)
      .mutation(api.applications.apply, {
        internshipId,
        resumeStorageId: validStorageId,
      });

    await expect(
      t
        .withIdentity(otherRecruiterIdentity)
        .mutation(api.applications.updateStatus, {
          applicationId,
          status: "under_review",
        })
    ).rejects.toThrow("FORBIDDEN");

    await expect(
      t
        .withIdentity(recruiterIdentity)
        .mutation(api.applications.updateStatus, {
          applicationId,
          status: "accepted",
        })
    ).rejects.toThrow("Invalid application status transition");
  });
});
