import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

const PAGE_SIZE = 3;

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

async function listCurrentUserResumes(
  t: ReturnType<typeof convexTest>,
  identity: { subject: string },
  cursor: string | null = null
) {
  return await t
    .withIdentity(identity)
    .query(api.candidateResumes.listForCurrentUser, {
      paginationOpts: {
        numItems: PAGE_SIZE,
        cursor,
      },
    });
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

    const initialList = await listCurrentUserResumes(t, candidateIdentity);

    expect(initialList.page).toHaveLength(1);
    expect(initialList.page[0]?.label).toBe("backend-resume");

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.rename, {
        candidateResumeId: createdResume.candidateResumeId,
        label: "Backend Resume",
      });

    const renamedList = await listCurrentUserResumes(t, candidateIdentity);

    expect(renamedList.page[0]?.label).toBe("Backend Resume");

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.remove, {
        candidateResumeId: createdResume.candidateResumeId,
      });

    const afterRemoval = await listCurrentUserResumes(t, candidateIdentity);

    expect(afterRemoval.page).toHaveLength(0);
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

  it("allows more than five resumes and paginates active results newest first", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_resume_many" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    const createdResumeIds: Id<"candidateResumes">[] = [];

    for (const index of Array.from({ length: 6 }, (_, value) => value)) {
      const storageId = (await t.action(
        internal.testHelpers.createTestPdfStorage,
        {}
      )) as Id<"_storage">;

      const createdResume = await t
        .withIdentity(candidateIdentity)
        .mutation(api.candidateResumes.create, {
          storageId,
          originalFilename: `resume-${index + 1}.pdf`,
        });

      createdResumeIds.push(createdResume.candidateResumeId);
    }

    const firstPage = await listCurrentUserResumes(t, candidateIdentity);

    expect(firstPage.page).toHaveLength(PAGE_SIZE);
    expect(firstPage.page.map((resume) => resume.originalFilename)).toEqual([
      "resume-6.pdf",
      "resume-5.pdf",
      "resume-4.pdf",
    ]);
    expect(firstPage.isDone).toBe(false);

    const secondPage = await listCurrentUserResumes(
      t,
      candidateIdentity,
      firstPage.continueCursor
    );

    expect(secondPage.page).toHaveLength(PAGE_SIZE);
    expect(secondPage.page.map((resume) => resume.originalFilename)).toEqual([
      "resume-3.pdf",
      "resume-2.pdf",
      "resume-1.pdf",
    ]);
    expect(secondPage.isDone).toBe(true);

    await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateResumes.remove, {
        candidateResumeId: createdResumeIds[5],
      });

    const afterRemoval = await listCurrentUserResumes(t, candidateIdentity);

    expect(afterRemoval.page.map((resume) => resume.originalFilename)).toEqual([
      "resume-5.pdf",
      "resume-4.pdf",
      "resume-3.pdf",
    ]);
    expect(
      afterRemoval.page.some((resume) => resume._id === createdResumeIds[5])
    ).toBe(false);
  });
});
