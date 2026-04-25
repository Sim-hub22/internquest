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
    email: "",
    role,
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/candidateResumes", () => {
  it("creates, lists, renames, and removes unused resumes", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_resume_owner" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    const storageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;

    const createdResume = await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.create, {
        storageId,
        originalFilename: "backend-resume.pdf",
      });

    const initialList = await t
      .withIdentity(candidateIdentity)
      .query(api.candidateResumes.listForCurrentUser, {});

    expect(initialList).toHaveLength(1);
    expect(initialList[0]?.label).toBe("backend-resume");

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.rename, {
        candidateResumeId: createdResume.candidateResumeId,
        label: "Backend Resume",
      });

    const renamedList = await t
      .withIdentity(candidateIdentity)
      .query(api.candidateResumes.listForCurrentUser, {});

    expect(renamedList[0]?.label).toBe("Backend Resume");

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.remove, {
        candidateResumeId: createdResume.candidateResumeId,
      });

    const afterRemoval = await t
      .withIdentity(candidateIdentity)
      .query(api.candidateResumes.listForCurrentUser, {});

    expect(afterRemoval).toHaveLength(0);
  });

  it("rejects non-PDF uploads and enforces ownership", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "candidate_resume_owner_2" };
    const otherCandidateIdentity = { subject: "candidate_resume_other" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(ownerIdentity.subject, "candidate")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(otherCandidateIdentity.subject, "candidate")
      );
    });

    const validStorageId = (await t.action(
      internal.testHelpers.createTestPdfStorage,
      {}
    )) as Id<"_storage">;
    const textStorageId = (await t.action(
      internal.testHelpers.createTestTextStorage,
      {}
    )) as Id<"_storage">;

    const createdResume = await t
      .withIdentity(ownerIdentity)
      .mutation(api.candidateResumes.create, {
        storageId: validStorageId,
        originalFilename: "owner-resume.pdf",
      });

    await expect(
      t.withIdentity(ownerIdentity).mutation(api.candidateResumes.create, {
        storageId: textStorageId,
        originalFilename: "not-a-pdf.txt",
      })
    ).rejects.toThrow("Resume must be a PDF file");

    await expect(
      t
        .withIdentity(otherCandidateIdentity)
        .mutation(api.candidateResumes.rename, {
          candidateResumeId: createdResume.candidateResumeId,
          label: "Stolen Resume",
        })
    ).rejects.toThrow("FORBIDDEN");
  });
});
