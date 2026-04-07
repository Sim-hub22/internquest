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

  it("allows incomplete quizzes to be saved as drafts", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_quiz_draft_owner" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
    });

    const quizId = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.quizzes.create, {
        title: "   ",
        description: "   ",
        draft: true,
        type: "recruitment",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "   ",
            points: 1,
            options: [
              { id: "a", text: "" },
              { id: "b", text: "" },
            ],
            correctOptionId: "",
          },
        ],
      });

    const quiz = await t
      .withIdentity(recruiterIdentity)
      .query(api.quizzes.getForRecruiter, {
        quizId,
      });

    expect(quiz.title).toBe("Untitled quiz");
    expect(quiz.isPublished).toBe(false);
    expect(quiz.questions[0]?.question).toBe("");
  });

  it("still rejects publishing incomplete quizzes", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_quiz_publish_guard" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
    });

    await expect(
      t.withIdentity(recruiterIdentity).mutation(api.quizzes.create, {
        title: "   ",
        description: "   ",
        type: "recruitment",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "   ",
            points: 1,
            options: [
              { id: "a", text: "" },
              { id: "b", text: "" },
            ],
            correctOptionId: "",
          },
        ],
      })
    ).rejects.toThrow("Question 1 must have text");
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

  it("blocks editing quizzes after attempts exist", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_quiz_update_guard" };
    const candidateIdentity = { subject: "candidate_quiz_update_guard" };

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

    const quizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Immutable Sample Quiz",
        description: "Practice quiz",
        type: "sample",
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

    await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.publish, { quizId });
    await t.withIdentity(candidateIdentity).mutation(api.quizAttempts.start, {
      quizId,
    });

    await expect(
      t.withIdentity(adminIdentity).mutation(api.quizzes.update, {
        quizId,
        title: "Updated title",
        description: "Updated description",
        timeLimit: 20,
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Updated prompt",
            points: 5,
            options: [
              { id: "a", text: "Syntax extension" },
              { id: "b", text: "Database" },
            ],
            correctOptionId: "a",
          },
        ],
      })
    ).rejects.toThrow(
      "Quizzes cannot be edited after they have been assigned or attempted"
    );
  });

  it("lists recruiter quizzes with total attempt and graded result counts", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_quiz_counts" };
    const firstCandidateIdentity = { subject: "candidate_quiz_counts_one" };
    const secondCandidateIdentity = { subject: "candidate_quiz_counts_two" };

    const seeded = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      const firstCandidateId = await ctx.db.insert(
        "users",
        createUserSeed(firstCandidateIdentity.subject, "candidate")
      );
      const secondCandidateId = await ctx.db.insert(
        "users",
        createUserSeed(secondCandidateIdentity.subject, "candidate")
      );

      return {
        recruiterId,
        firstCandidateId,
        secondCandidateId,
      };
    });

    const draftQuizId = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.quizzes.create, {
        title: "Unused recruiter draft",
        description: "No attempts yet",
        draft: true,
        type: "recruitment",
        questions: [
          {
            id: "draft-q1",
            type: "multiple_choice",
            question: "",
            points: 1,
            options: [
              { id: "a", text: "" },
              { id: "b", text: "" },
            ],
            correctOptionId: "",
          },
        ],
      });

    const scoredQuizId = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.quizzes.create, {
        title: "Screening quiz with results",
        description: "Counts should show up",
        type: "recruitment",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Which hook stores local state?",
            points: 3,
            options: [
              { id: "a", text: "useState" },
              { id: "b", text: "useRouter" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q2",
            type: "short_answer",
            question: "Explain a rerender trigger.",
            points: 5,
            sampleAnswer: "State changes schedule a rerender.",
          },
        ],
      });

    await t.withIdentity(recruiterIdentity).mutation(api.quizzes.publish, {
      quizId: scoredQuizId,
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("quizAttempts", {
        quizId: scoredQuizId,
        candidateId: seeded.firstCandidateId,
        attemptType: "application",
        answers: [
          {
            questionId: "q1",
            type: "multiple_choice",
            selectedOptionId: "a",
            awardedPoints: 3,
            isCorrect: true,
          },
          {
            questionId: "q2",
            type: "short_answer",
            textAnswer: "A state update rerenders the component.",
          },
        ],
        autoScore: 3,
        maxScore: 8,
        startedAt: Date.now() - 5_000,
        submittedAt: Date.now() - 4_000,
        submissionMode: "manual",
        status: "submitted",
      });

      await ctx.db.insert("quizAttempts", {
        quizId: scoredQuizId,
        candidateId: seeded.secondCandidateId,
        attemptType: "application",
        answers: [
          {
            questionId: "q1",
            type: "multiple_choice",
            selectedOptionId: "a",
            awardedPoints: 3,
            isCorrect: true,
          },
          {
            questionId: "q2",
            type: "short_answer",
            textAnswer: "Changing state schedules a fresh render pass.",
            awardedPoints: 5,
          },
        ],
        score: 8,
        autoScore: 3,
        manualScore: 5,
        maxScore: 8,
        startedAt: Date.now() - 3_000,
        submittedAt: Date.now() - 2_000,
        gradedAt: Date.now() - 1_000,
        submissionMode: "manual",
        status: "graded",
        gradedBy: seeded.recruiterId,
      });
    });

    const quizzes = await t
      .withIdentity(recruiterIdentity)
      .query(api.quizzes.listForRecruiter, {});

    expect(quizzes.find((quiz) => quiz._id === draftQuizId)).toMatchObject({
      totalAttempts: 0,
      gradedAttempts: 0,
    });
    expect(quizzes.find((quiz) => quiz._id === scoredQuizId)).toMatchObject({
      totalAttempts: 2,
      gradedAttempts: 1,
    });
  });

  it("returns answer keys in owner previews and blocks non-owners", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "recruiter_owner_preview" };
    const otherRecruiterIdentity = { subject: "recruiter_non_owner_preview" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(ownerIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(otherRecruiterIdentity.subject, "recruiter")
      );
    });

    const quizId = await t
      .withIdentity(ownerIdentity)
      .mutation(api.quizzes.create, {
        title: "Previewable recruitment quiz",
        description: "Preview me",
        type: "recruitment",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Which hook stores local state?",
            points: 4,
            options: [
              { id: "a", text: "useState" },
              { id: "b", text: "usePathname" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q2",
            type: "short_answer",
            question: "Explain why state updates trigger rerenders.",
            points: 6,
            sampleAnswer:
              "State updates enqueue a rerender with the new value.",
          },
        ],
      });

    const preview = await t
      .withIdentity(ownerIdentity)
      .query(api.quizzes.getOwnerPreview, {
        quizId,
      });

    expect(preview?.quiz.questions[0]).toMatchObject({
      correctOptionId: "a",
    });
    expect(preview?.quiz.questions[1]).toMatchObject({
      sampleAnswer: "State updates enqueue a rerender with the new value.",
    });
    expect(preview?.quiz.title).toBe("Previewable recruitment quiz");

    await expect(
      t
        .withIdentity(otherRecruiterIdentity)
        .query(api.quizzes.getOwnerPreview, {
          quizId,
        })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("deletes unused quizzes and rejects deleting used quizzes or non-owner deletes", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_quiz_delete_owner" };
    const otherAdminIdentity = { subject: "admin_quiz_delete_other" };
    const candidateIdentity = { subject: "candidate_quiz_delete_guard" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(otherAdminIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    const draftQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Unused draft quiz",
        description: "Delete me",
        draft: true,
        type: "sample",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "",
            points: 1,
            options: [
              { id: "a", text: "" },
              { id: "b", text: "" },
            ],
            correctOptionId: "",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.remove, {
      quizId: draftQuizId,
    });

    const deletedDraft = await t.run(async (ctx) => ctx.db.get(draftQuizId));
    expect(deletedDraft).toBeNull();

    const usedQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Used sample quiz",
        description: "Should stay",
        type: "sample",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "What does DOM stand for?",
            points: 3,
            options: [
              { id: "a", text: "Document Object Model" },
              { id: "b", text: "Data Object Method" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await t.withIdentity(adminIdentity).mutation(api.quizzes.publish, {
      quizId: usedQuizId,
    });
    await t.withIdentity(candidateIdentity).mutation(api.quizAttempts.start, {
      quizId: usedQuizId,
    });

    await expect(
      t.withIdentity(adminIdentity).mutation(api.quizzes.remove, {
        quizId: usedQuizId,
      })
    ).rejects.toThrow(
      "Quizzes cannot be deleted after they have been assigned or attempted"
    );

    const otherQuizId = await t
      .withIdentity(adminIdentity)
      .mutation(api.quizzes.create, {
        title: "Protected quiz",
        description: "Only owner can delete",
        type: "sample",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            question: "Which one is HTML?",
            points: 2,
            options: [
              { id: "a", text: "Markup" },
              { id: "b", text: "Database" },
            ],
            correctOptionId: "a",
          },
        ],
      });

    await expect(
      t.withIdentity(otherAdminIdentity).mutation(api.quizzes.remove, {
        quizId: otherQuizId,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("rejects sample quizzes with short answer questions", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_sample_quiz_guard" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    await expect(
      t.withIdentity(adminIdentity).mutation(api.quizzes.create, {
        title: "Ungradable sample quiz",
        description: "Should be rejected",
        type: "sample",
        questions: [
          {
            id: "q1",
            type: "short_answer",
            question: "Explain closures.",
            points: 5,
            sampleAnswer: "A closure captures lexical scope.",
          },
        ],
      })
    ).rejects.toThrow(
      "Sample quizzes can only include multiple choice questions"
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
