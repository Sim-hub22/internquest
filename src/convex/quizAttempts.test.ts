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

async function seedRecruitmentQuizScenario(
  t: ReturnType<typeof convexTest>,
  questions: Array<{
    id: string;
    type: "multiple_choice" | "short_answer";
    question: string;
    points: number;
    options?: { id: string; text: string }[];
    correctOptionId?: string;
    sampleAnswer?: string;
  }>
) {
  const recruiterIdentity = { subject: "attempt_recruiter" };
  const candidateIdentity = { subject: "attempt_candidate" };
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
      title: "Quiz Attempt Internship",
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

  const quizId = await t
    .withIdentity(recruiterIdentity)
    .mutation(api.quizzes.create, {
      title: "Attempt Quiz",
      description: "attempt flow",
      type: "recruitment",
      timeLimit: 1,
      questions,
    });

  await t.withIdentity(recruiterIdentity).mutation(api.quizzes.publish, {
    quizId,
  });
  await t
    .withIdentity(recruiterIdentity)
    .mutation(api.quizzes.assignToApplication, {
      applicationId: seeded.applicationId,
      quizId,
    });

  return {
    recruiterIdentity,
    candidateIdentity,
    quizId,
    ...seeded,
  };
}

describe("convex/quizAttempts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-18T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("auto-grades MCQ recruitment quizzes and completes the linked application", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedRecruitmentQuizScenario(t, [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Which API updates React state?",
        points: 5,
        options: [
          { id: "a", text: "useState" },
          { id: "b", text: "useServer" },
        ],
        correctOptionId: "a",
      },
    ]);

    const attemptId = await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.start, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q1",
        selectedOptionId: "a",
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.submit, {
        attemptId,
      });

    const result = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });
    const applicationDetail = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.applications.getRecruiterDetail, {
        applicationId: seeded.applicationId,
      });
    const notifications = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.notifications.listUnread, {});
    const recruiterNotifications = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.notifications.listUnread, {});

    expect(result?.attempt.status).toBe("graded");
    expect(result?.attempt.score).toBe(5);
    expect(applicationDetail.application.status).toBe("quiz_completed");
    expect(notifications.some((item) => item.type === "quiz_graded")).toBe(
      true
    );
    expect(
      recruiterNotifications.some((item) => item.type === "quiz_submitted")
    ).toBe(true);
  });

  it("keeps mixed quizzes pending until recruiter grading and then finalizes the score", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedRecruitmentQuizScenario(t, [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Which API reads props?",
        points: 4,
        options: [
          { id: "a", text: "function args" },
          { id: "b", text: "useState" },
        ],
        correctOptionId: "a",
      },
      {
        id: "q2",
        type: "short_answer",
        question: "Explain why keys matter in React lists.",
        points: 6,
        sampleAnswer: "Stable keys help React reconcile list items correctly.",
      },
    ]);

    const attemptId = await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.start, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q1",
        selectedOptionId: "a",
      });
    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q2",
        textAnswer: "Keys keep item identity stable between renders.",
      });
    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.submit, {
        attemptId,
      });

    const pendingResult = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });
    const recruiterNotifications = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.notifications.listUnread, {});

    expect(pendingResult?.pendingManualReview).toBe(true);
    expect(pendingResult?.attempt.status).toBe("submitted");
    expect(
      recruiterNotifications.some((item) => item.type === "quiz_submitted")
    ).toBe(true);

    await t
      .withIdentity(seeded.recruiterIdentity)
      .mutation(api.quizAttempts.grade, {
        attemptId,
        grades: [
          { questionId: "q2", awardedPoints: 5, feedback: "Good depth" },
        ],
      });

    const gradedResult = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    expect(gradedResult?.attempt.status).toBe("graded");
    expect(gradedResult?.attempt.score).toBe(9);
    expect(gradedResult?.pendingManualReview).toBe(false);
    expect(gradedResult?.questionBreakdown).toHaveLength(2);
  });

  it("auto-submits recruitment quizzes for policy violations and exposes the violation to recruiters", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedRecruitmentQuizScenario(t, [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Which API handles local component state?",
        points: 5,
        options: [
          { id: "a", text: "useState" },
          { id: "b", text: "cookies" },
        ],
        correctOptionId: "a",
      },
    ]);

    const attemptId = await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.start, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q1",
        selectedOptionId: "a",
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.submitForPolicyViolation, {
        attemptId,
        policyViolationType: "tab_hidden",
      });

    const result = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });
    const recruiterResults = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.quizAttempts.listResultsForRecruiter, {
        quizId: seeded.quizId,
      });
    const applicationDetail = await t
      .withIdentity(seeded.recruiterIdentity)
      .query(api.applications.getRecruiterDetail, {
        applicationId: seeded.applicationId,
      });

    expect(result?.attempt.status).toBe("graded");
    expect(result?.attempt.score).toBe(5);
    expect(result?.attempt.submissionMode).toBe("policy_violation");
    expect(result?.attempt.policyViolationType).toBe("tab_hidden");
    expect(result?.attempt.policyViolationAt).toBeTypeOf("number");
    expect(applicationDetail.application.status).toBe("quiz_completed");
    expect(recruiterResults?.results[0]?.attempt.submissionMode).toBe(
      "policy_violation"
    );
    expect(recruiterResults?.results[0]?.attempt.policyViolationType).toBe(
      "tab_hidden"
    );
  });

  it("keeps mixed policy-violation attempts pending manual review", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedRecruitmentQuizScenario(t, [
      {
        id: "q1",
        type: "multiple_choice",
        question: "What is JSX?",
        points: 4,
        options: [
          { id: "a", text: "Syntax extension" },
          { id: "b", text: "Database" },
        ],
        correctOptionId: "a",
      },
      {
        id: "q2",
        type: "short_answer",
        question: "Explain reconciliation in React.",
        points: 6,
        sampleAnswer: "React compares tree updates efficiently.",
      },
    ]);

    const attemptId = await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.start, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q1",
        selectedOptionId: "a",
      });
    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q2",
        textAnswer: "React reconciles trees to update only what changed.",
      });

    await t
      .withIdentity(seeded.candidateIdentity)
      .mutation(api.quizAttempts.submitForPolicyViolation, {
        attemptId,
        policyViolationType: "page_exit",
      });

    const result = await t
      .withIdentity(seeded.candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: seeded.quizId,
        applicationId: seeded.applicationId,
      });

    expect(result?.attempt.status).toBe("submitted");
    expect(result?.pendingManualReview).toBe(true);
    expect(result?.attempt.submissionMode).toBe("policy_violation");
    expect(result?.attempt.policyViolationType).toBe("page_exit");
  });

  it("allows signed-in users to take sample quizzes and auto-submits timed out attempts", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "sample_admin" };
    const candidateIdentity = { subject: "sample_candidate" };

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

    const sampleQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Timed Sample Quiz",
        description: "Public practice",
        type: "sample",
        timeLimit: 1,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "What does CSS stand for?",
            points: 3,
            options: [
              { id: "a", text: "Cascading Style Sheets" },
              { id: "b", text: "Code Styling Syntax" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.publish, {
      quizId: sampleQuizId,
    });

    const attemptId = await t
      .withIdentity(candidateIdentity)
      .mutation(api.quizAttempts.start, {
        quizId: sampleQuizId,
      });

    vi.advanceTimersByTime(61_000);
    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers();
    });

    const result = await t
      .withIdentity(candidateIdentity)
      .query(api.quizAttempts.getCandidateResult, {
        quizId: sampleQuizId,
      });

    expect(result?.attempt._id).toBe(attemptId);
    expect(result?.attempt.status).toBe("graded");
    expect(result?.attempt.submissionMode).toBe("timeout");
    await expect(
      t.withIdentity(candidateIdentity).mutation(api.quizAttempts.saveAnswer, {
        attemptId,
        questionId: "q1",
        selectedOptionId: "a",
      })
    ).rejects.toThrow("This attempt can no longer be updated");
  });

  it("keeps sample quiz previews public while requiring authentication to start attempts", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "sample_public_preview_admin" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const sampleQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Preview Before Practice",
        description: "Public preview sample quiz",
        type: "sample",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Which CSS property changes spacing inside an element?",
            points: 2,
            options: [
              { id: "a", text: "padding" },
              { id: "b", text: "margin" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.publish, {
      quizId: sampleQuizId,
    });

    const preview = await t.query(api.quizzes.getPublishedSample, {
      quizId: sampleQuizId,
    });

    expect(preview?.quiz.title).toBe("Preview Before Practice");
    expect(preview?.viewerAttempt).toBeNull();
    await expect(
      t.mutation(api.quizAttempts.start, {
        quizId: sampleQuizId,
      })
    ).rejects.toThrow("UNAUTHENTICATED");
  });
});
