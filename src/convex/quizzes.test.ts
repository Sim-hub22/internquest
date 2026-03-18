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

async function seedShortlistedApplication(t: ReturnType<typeof convexTest>) {
  const recruiterIdentity = { subject: "quiz_recruiter_seed" };
  const candidateIdentity = { subject: "quiz_candidate_seed" };
  const resumeStorageId = (await t.action(
    internal.testHelpers.createTestPdfStorage,
    {}
  )) as Id<"_storage">;

  const seeded = await t.run(async (ctx) => {
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
      title: "Quiz Internship",
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
    const applicationId = await ctx.db.insert("applications", {
      internshipId,
      candidateId,
      resumeStorageId,
      status: "shortlisted",
      statusHistory: [
        {
          status: "applied",
          changedAt: Date.now() - 2_000,
          changedBy: candidateId,
        },
        {
          status: "shortlisted",
          changedAt: Date.now() - 1_000,
          changedBy: recruiterId,
        },
      ],
      appliedAt: Date.now() - 2_000,
      updatedAt: Date.now() - 1_000,
    });

    return { recruiterId, candidateId, internshipId, applicationId };
  });

  return {
    recruiterIdentity,
    candidateIdentity,
    ...seeded,
  };
}

describe("convex/quizzes", () => {
  it("lets recruiters manage recruitment quizzes and admins manage sample quizzes", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_quiz_owner" };
    const adminIdentity = { subject: "admin_quiz_owner" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const recruitmentQuizId = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.quizzes.create, {
        title: "  Frontend Screening  ",
        description: "  Core frontend questions  ",
        type: "recruitment",
        timeLimit: 20,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "  Which hook triggers state updates?  ",
            points: 5,
            options: [
              { id: "a", text: "useState" },
              { id: "b", text: "useRoute" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(recruiterIdentity).mutation(api.quizzes.publish, {
      quizId: recruitmentQuizId,
    });

    const recruitmentQuiz = await t
      .withIdentity(recruiterIdentity)
      .query(api.quizzes.getForRecruiter, {
        quizId: recruitmentQuizId,
      });

    expect(recruitmentQuiz.title).toBe("Frontend Screening");
    expect(recruitmentQuiz.description).toBe("Core frontend questions");
    expect(recruitmentQuiz.isPublished).toBe(true);

    const sampleQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Public JavaScript Basics",
        description: "Practice quiz",
        type: "sample",
        timeLimit: 10,
        questions: [
          {
            id: "sample-q1",
            type: "multiple_choice",
            question: "What does JS stand for?",
            points: 3,
            options: [
              { id: "a", text: "JavaScript" },
              { id: "b", text: "JavaSource" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.publish, {
      quizId: sampleQuizId,
    });

    const publicSamples = await t.query(api.quizzes.listPublishedSamples, {});

    expect(publicSamples.some((quiz) => quiz._id === sampleQuizId)).toBe(true);
    await expect(
      t.withIdentity(recruiterIdentity).query(api.quizzes.getForAdmin, {
        quizId: sampleQuizId,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("assigns published quizzes only to shortlisted applications and notifies the candidate", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedShortlistedApplication(t);

    const quizId = await t
      .withIdentity(seeded.recruiterIdentity)
      .mutation(api.quizzes.create, {
        title: "Screening Quiz",
        description: "Assigned quiz",
        type: "recruitment",
        timeLimit: 15,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "What is JSX?",
            points: 5,
            options: [
              { id: "a", text: "Syntax extension" },
              { id: "b", text: "Database" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await expect(
      t
        .withIdentity(seeded.recruiterIdentity)
        .mutation(api.quizzes.assignToApplication, {
          applicationId: seeded.applicationId,
          quizId,
        })
    ).rejects.toThrow("Only published quizzes can be assigned");

    await t
      .withIdentity(seeded.recruiterIdentity)
      .mutation(api.quizzes.publish, {
        quizId,
      });

    await t
      .withIdentity(seeded.recruiterIdentity)
      .mutation(api.quizzes.assignToApplication, {
        applicationId: seeded.applicationId,
        quizId,
      });

    const detail = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.applications.getRecruiterDetail, {
        applicationId: seeded.applicationId,
      });
    const notifications = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.notifications.listUnread, {});

    expect(detail.application.status).toBe("quiz_assigned");
    expect(detail.assignedQuiz?._id).toBe(quizId);
    expect(notifications.some((item) => item.type === "quiz_assigned")).toBe(
      true
    );
  });

  it("exposes published sample quiz details publicly without leaking the answer key", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_public_samples" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const sampleQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Public CSS Quiz",
        description: "Practice CSS",
        type: "sample",
        timeLimit: 12,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Which property changes text color?",
            points: 4,
            options: [
              { id: "a", text: "color" },
              { id: "b", text: "background" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.publish, {
      quizId: sampleQuizId,
    });

    const sample = await t.query(api.quizzes.getPublishedSample, {
      quizId: sampleQuizId,
    });

    expect(sample?.quiz.title).toBe("Public CSS Quiz");
    expect(sample?.quiz.questions[0]).not.toHaveProperty("correctOptionId");
    expect(sample?.viewerAttempt).toBeNull();
  });
});
