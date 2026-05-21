import { type TestConvex, convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
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
    status: "draft" | "open" | "closed";
    applicationDeadline: number;
  }>
) {
  const now = Date.now();

  return {
    recruiterId,
    title: overrides?.title ?? "Software Internship",
    company: "InternQuest",
    description: "Great internship",
    category: "technology" as const,
    location: "Kathmandu",
    locationType: "remote" as const,
    duration: "3 months",
    requirements: ["TypeScript"],
    status: overrides?.status ?? "open",
    applicationDeadline:
      overrides?.applicationDeadline ?? now + 10 * 24 * 60 * 60 * 1000,
    maxApplications: 20,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedUsersAndInternship(t: TestConvex<typeof schema>) {
  const candidateIdentity = { subject: "candidate_bookmarks" };
  const otherCandidateIdentity = { subject: "candidate_bookmarks_other" };
  const recruiterIdentity = { subject: "recruiter_bookmarks" };

  const ids = await t.run(async (ctx) => {
    const candidateId = await ctx.db.insert(
      "users",
      createTestUser(candidateIdentity.subject, "candidate")
    );
    const otherCandidateId = await ctx.db.insert(
      "users",
      createTestUser(otherCandidateIdentity.subject, "candidate")
    );
    const recruiterId = await ctx.db.insert(
      "users",
      createTestUser(recruiterIdentity.subject, "recruiter")
    );
    const internshipId = await ctx.db.insert(
      "internships",
      createInternshipSeed(recruiterId)
    );

    return { candidateId, otherCandidateId, recruiterId, internshipId };
  });

  return {
    ...ids,
    candidateIdentity,
    otherCandidateIdentity,
    recruiterIdentity,
  };
}

describe("convex/internshipBookmarks", () => {
  it("rejects bookmark toggles for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { internshipId } = await seedUsersAndInternship(t);

    await expect(
      t.mutation(api.internshipBookmarks.toggle, { internshipId })
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("rejects bookmark toggles for non-candidates", async () => {
    const t = convexTest(schema, modules);
    const { internshipId, recruiterIdentity } = await seedUsersAndInternship(t);

    await expect(
      t
        .withIdentity(recruiterIdentity)
        .mutation(api.internshipBookmarks.toggle, { internshipId })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("creates and removes bookmarks for candidates", async () => {
    const t = convexTest(schema, modules);
    const { internshipId, candidateIdentity } = await seedUsersAndInternship(t);

    await expect(
      t
        .withIdentity(candidateIdentity)
        .mutation(api.internshipBookmarks.toggle, { internshipId })
    ).resolves.toEqual({ isBookmarked: true });

    await expect(
      t
        .withIdentity(candidateIdentity)
        .query(api.internshipBookmarks.getForCurrentCandidateByInternship, {
          internshipId,
        })
    ).resolves.toMatchObject({ isBookmarked: true });

    await expect(
      t
        .withIdentity(candidateIdentity)
        .mutation(api.internshipBookmarks.toggle, { internshipId })
    ).resolves.toEqual({ isBookmarked: false });

    await expect(
      t
        .withIdentity(candidateIdentity)
        .query(api.internshipBookmarks.getForCurrentCandidateByInternship, {
          internshipId,
        })
    ).resolves.toMatchObject({ isBookmarked: false });
  });

  it("does not create duplicate bookmark rows", async () => {
    const t = convexTest(schema, modules);
    const { internshipId, candidateId, candidateIdentity } =
      await seedUsersAndInternship(t);

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internshipBookmarks.toggle, { internshipId });

    const bookmarks = await t.run(async (ctx) => {
      return await ctx.db
        .query("internshipBookmarks")
        .withIndex("by_candidate_and_internship", (q) =>
          q.eq("candidateId", candidateId).eq("internshipId", internshipId)
        )
        .collect();
    });

    expect(bookmarks).toHaveLength(1);
  });

  it("lists only the current candidate's bookmarks", async () => {
    const t = convexTest(schema, modules);
    const {
      internshipId,
      candidateIdentity,
      otherCandidateIdentity,
      recruiterId,
    } = await seedUsersAndInternship(t);

    const otherInternshipId = await t.run(async (ctx) => {
      return await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, { title: "Other Internship" })
      );
    });

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.internshipBookmarks.toggle, { internshipId });
    await t
      .withIdentity(otherCandidateIdentity)
      .mutation(api.internshipBookmarks.toggle, {
        internshipId: otherInternshipId,
      });

    const bookmarks = await t
      .withIdentity(candidateIdentity)
      .query(api.internshipBookmarks.listForCurrentCandidate, { limit: 4 });

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]?.internshipId).toBe(internshipId);
    expect(bookmarks[0]?.internship?.title).toBe("Software Internship");
  });

  it("returns closed and expired saved internships as unavailable", async () => {
    const t = convexTest(schema, modules);
    const { candidateId, candidateIdentity, recruiterId } =
      await seedUsersAndInternship(t);

    await t.run(async (ctx) => {
      const closedInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Closed Internship",
          status: "closed",
        })
      );
      const expiredInternshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId, {
          title: "Expired Internship",
          applicationDeadline: Date.now() - 1,
        })
      );

      await ctx.db.insert("internshipBookmarks", {
        candidateId,
        internshipId: closedInternshipId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("internshipBookmarks", {
        candidateId,
        internshipId: expiredInternshipId,
        createdAt: Date.now() + 1,
      });
    });

    const bookmarks = await t
      .withIdentity(candidateIdentity)
      .query(api.internshipBookmarks.listForCurrentCandidate, { limit: 4 });

    expect(bookmarks).toHaveLength(2);
    expect(bookmarks.map((bookmark) => bookmark.isAvailable)).toEqual([
      false,
      false,
    ]);
    expect(
      bookmarks.map((bookmark) => bookmark.unavailableReason).sort()
    ).toEqual(["Applications closed", "Deadline passed"]);
  });
});
