import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  internalMutation,
  mutation,
  query,
} from "@/convex/_generated/server";
import { requireRole, requireUser } from "@/convex/lib/auth";
import { createNotification } from "@/convex/lib/notifications";
import {
  type QuizAnswer,
  calculateMaxScore,
  getAnswerMap,
  hasManualQuestions,
  normalizeOptionalText,
  submissionModeValidator,
  toQuestionMap,
} from "@/convex/lib/quizzes";

const SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace(/\/$/, "") ?? "";

const answerInputValidator = v.object({
  attemptId: v.id("quizAttempts"),
  questionId: v.string(),
  selectedOptionId: v.optional(v.string()),
  textAnswer: v.optional(v.string()),
});

const gradeInputValidator = v.object({
  questionId: v.string(),
  awardedPoints: v.number(),
  feedback: v.optional(v.string()),
});

function buildCandidateResultPath(
  quizId: Id<"quizzes">,
  applicationId?: Id<"applications">
) {
  const path = `/candidate/quizzes/${quizId}/result`;
  return applicationId ? `${path}?applicationId=${applicationId}` : path;
}

function buildAbsoluteUrl(path: string) {
  return SITE_URL ? `${SITE_URL}${path}` : path;
}

function sanitizeQuizForTaker(quiz: Doc<"quizzes">) {
  return {
    _id: quiz._id,
    _creationTime: quiz._creationTime,
    creatorId: quiz.creatorId,
    title: quiz.title,
    description: quiz.description,
    type: quiz.type,
    internshipId: quiz.internshipId,
    timeLimit: quiz.timeLimit,
    isPublished: quiz.isPublished,
    publishedAt: quiz.publishedAt,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      type: question.type,
      question: question.question,
      points: question.points,
      ...(question.options ? { options: question.options } : {}),
    })),
  };
}

function buildResultQuestions(quiz: Doc<"quizzes">, answers: QuizAnswer[]) {
  const answerMap = getAnswerMap(answers);

  return quiz.questions.map((question) => {
    const answer = answerMap.get(question.id);

    return {
      id: question.id,
      type: question.type,
      question: question.question,
      points: question.points,
      options: question.options,
      correctOptionId: question.correctOptionId,
      sampleAnswer: question.sampleAnswer,
      answer: answer ?? null,
    };
  });
}

async function getAttemptOrThrow(
  ctx: MutationCtx,
  attemptId: Id<"quizAttempts">
) {
  const attempt = await ctx.db.get(attemptId);

  if (!attempt) {
    throw new ConvexError("Quiz attempt not found");
  }

  const quiz = await ctx.db.get(attempt.quizId);

  if (!quiz) {
    throw new ConvexError("Quiz not found");
  }

  return { attempt, quiz };
}

async function ensureCandidateOwnsApplication(
  ctx: MutationCtx,
  candidateId: Id<"users">,
  applicationId: Id<"applications">
) {
  const application = await ctx.db.get(applicationId);

  if (!application) {
    throw new ConvexError("Application not found");
  }

  if (application.candidateId !== candidateId) {
    throw new ConvexError("FORBIDDEN");
  }

  return application;
}

async function transitionApplicationToQuizCompleted(
  ctx: MutationCtx,
  attempt: Doc<"quizAttempts">,
  submittedAt: number
) {
  if (!attempt.applicationId) {
    return null;
  }

  const application = await ctx.db.get(attempt.applicationId);

  if (!application) {
    return null;
  }

  if (application.status !== "quiz_assigned") {
    return application;
  }

  await ctx.db.patch(application._id, {
    status: "quiz_completed",
    statusHistory: [
      ...application.statusHistory,
      {
        status: "quiz_completed",
        changedAt: submittedAt,
        changedBy: attempt.candidateId,
      },
    ],
    updatedAt: submittedAt,
  });

  return {
    ...application,
    status: "quiz_completed" as const,
    updatedAt: submittedAt,
    statusHistory: [
      ...application.statusHistory,
      {
        status: "quiz_completed",
        changedAt: submittedAt,
        changedBy: attempt.candidateId,
      },
    ],
  };
}

async function notifyCandidateAboutGrading(
  ctx: MutationCtx,
  attempt: Doc<"quizAttempts">,
  quiz: Doc<"quizzes">,
  finalScore: number
) {
  if (!attempt.applicationId) {
    return;
  }

  const application = await ctx.db.get(attempt.applicationId);

  if (!application) {
    return;
  }

  const candidate = await ctx.db.get(attempt.candidateId);

  if (!candidate) {
    return;
  }

  const resultsPath = buildCandidateResultPath(quiz._id, application._id);

  await createNotification(ctx, {
    userId: candidate._id,
    type: "quiz_graded",
    title: `Results ready for ${quiz.title}`,
    message: `Your ${quiz.title} quiz has been graded.`,
    link: resultsPath,
    relatedId: attempt._id,
  });

  if (candidate.email) {
    await ctx.scheduler.runAfter(0, internal.emailActions.sendQuizGradedEmail, {
      to: candidate.email,
      name: candidate.name,
      quizTitle: quiz.title,
      score: finalScore,
      maxScore: attempt.maxScore,
      resultsUrl: buildAbsoluteUrl(resultsPath),
    });
  }
}

async function finalizeAttemptSubmission(
  ctx: MutationCtx,
  attempt: Doc<"quizAttempts">,
  quiz: Doc<"quizzes">,
  submissionMode: "manual" | "timeout"
) {
  const answerMap = getAnswerMap(attempt.answers);
  const now = Date.now();
  const manualQuestions = hasManualQuestions(quiz.questions);

  const answers = quiz.questions.map((question) => {
    const existing = answerMap.get(question.id);

    if (question.type === "multiple_choice") {
      const selectedOptionId = existing?.selectedOptionId;
      const isCorrect = selectedOptionId === question.correctOptionId;

      return {
        questionId: question.id,
        type: question.type,
        ...(selectedOptionId ? { selectedOptionId } : {}),
        awardedPoints: isCorrect ? question.points : 0,
        isCorrect,
      };
    }

    const textAnswer = normalizeOptionalText(existing?.textAnswer);

    return {
      questionId: question.id,
      type: question.type,
      ...(textAnswer ? { textAnswer } : {}),
    };
  });

  const autoScore = answers.reduce(
    (total, answer) =>
      total +
      (answer.type === "multiple_choice" ? (answer.awardedPoints ?? 0) : 0),
    0
  );

  const status = manualQuestions ? "submitted" : "graded";
  const patch = {
    answers,
    autoScore,
    ...(manualQuestions
      ? {}
      : { manualScore: 0, score: autoScore, gradedAt: now }),
    submittedAt: now,
    submissionMode,
    status,
  } as const;

  await ctx.db.patch(attempt._id, patch);
  await transitionApplicationToQuizCompleted(ctx, attempt, now);

  if (!manualQuestions) {
    await notifyCandidateAboutGrading(ctx, attempt, quiz, autoScore);
  }

  return {
    ...attempt,
    ...patch,
  };
}

export const submitTimedOutAttempt = internalMutation({
  args: {
    attemptId: v.id("quizAttempts"),
  },
  handler: async (ctx, args): Promise<null> => {
    const attempt = await ctx.db.get(args.attemptId);

    if (!attempt || attempt.status !== "in_progress" || !attempt.deadlineAt) {
      return null;
    }

    if (attempt.deadlineAt > Date.now()) {
      return null;
    }

    const quiz = await ctx.db.get(attempt.quizId);

    if (!quiz) {
      return null;
    }

    await finalizeAttemptSubmission(ctx, attempt, quiz, "timeout");
    return null;
  },
});

export const start = mutation({
  args: {
    quizId: v.id("quizzes"),
    applicationId: v.optional(v.id("applications")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz || !quiz.isPublished) {
      throw new ConvexError("Quiz not found");
    }

    if (quiz.type === "recruitment") {
      const candidate = await requireRole(ctx, "candidate");

      if (!args.applicationId) {
        throw new ConvexError("Application context is required");
      }

      const application = await ensureCandidateOwnsApplication(
        ctx,
        candidate._id,
        args.applicationId
      );

      if (application.assignedQuizId !== quiz._id) {
        throw new ConvexError("This quiz is not assigned to the application");
      }

      const existingAttempt = await ctx.db
        .query("quizAttempts")
        .withIndex("by_application", (q) =>
          q.eq("applicationId", application._id)
        )
        .unique();

      if (existingAttempt) {
        return existingAttempt._id;
      }

      if (application.status !== "quiz_assigned") {
        throw new ConvexError("This quiz can no longer be started");
      }

      const startedAt = Date.now();
      const deadlineAt = quiz.timeLimit
        ? startedAt + quiz.timeLimit * 60 * 1000
        : undefined;
      const attemptId = await ctx.db.insert("quizAttempts", {
        quizId: quiz._id,
        candidateId: candidate._id,
        applicationId: application._id,
        attemptType: "application",
        answers: [],
        maxScore: calculateMaxScore(quiz.questions),
        startedAt,
        ...(deadlineAt ? { deadlineAt } : {}),
        ...(quiz.timeLimit ? { timeLimit: quiz.timeLimit } : {}),
        status: "in_progress",
      });

      if (deadlineAt) {
        await ctx.scheduler.runAfter(
          deadlineAt - startedAt,
          internal.quizAttempts.submitTimedOutAttempt,
          { attemptId }
        );
      }

      return attemptId;
    }

    const existingSampleAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_candidate_and_quiz_and_attemptType", (q) =>
        q
          .eq("candidateId", user._id)
          .eq("quizId", quiz._id)
          .eq("attemptType", "sample")
      )
      .unique();

    if (existingSampleAttempt) {
      return existingSampleAttempt._id;
    }

    const startedAt = Date.now();
    const deadlineAt = quiz.timeLimit
      ? startedAt + quiz.timeLimit * 60 * 1000
      : undefined;
    const attemptId = await ctx.db.insert("quizAttempts", {
      quizId: quiz._id,
      candidateId: user._id,
      attemptType: "sample",
      answers: [],
      maxScore: calculateMaxScore(quiz.questions),
      startedAt,
      ...(deadlineAt ? { deadlineAt } : {}),
      ...(quiz.timeLimit ? { timeLimit: quiz.timeLimit } : {}),
      status: "in_progress",
    });

    if (deadlineAt) {
      await ctx.scheduler.runAfter(
        deadlineAt - startedAt,
        internal.quizAttempts.submitTimedOutAttempt,
        { attemptId }
      );
    }

    return attemptId;
  },
});

export const saveAnswer = mutation({
  args: answerInputValidator,
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const { attempt, quiz } = await getAttemptOrThrow(ctx, args.attemptId);

    if (attempt.candidateId !== user._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (attempt.status !== "in_progress") {
      throw new ConvexError("This attempt can no longer be updated");
    }

    if (attempt.deadlineAt && attempt.deadlineAt <= Date.now()) {
      await finalizeAttemptSubmission(ctx, attempt, quiz, "timeout");
      throw new ConvexError("Quiz time has expired");
    }

    const question = toQuestionMap(quiz.questions).get(args.questionId);

    if (!question) {
      throw new ConvexError("Question not found");
    }

    if (question.type === "multiple_choice") {
      const optionIds = new Set(
        question.options?.map((option) => option.id) ?? []
      );

      if (!args.selectedOptionId || !optionIds.has(args.selectedOptionId)) {
        throw new ConvexError("Select a valid option");
      }
    } else if (!normalizeOptionalText(args.textAnswer)) {
      throw new ConvexError("Answer text is required");
    }

    const answers = [
      ...attempt.answers.filter(
        (answer) => answer.questionId !== args.questionId
      ),
      {
        questionId: args.questionId,
        type: question.type,
        ...(question.type === "multiple_choice"
          ? { selectedOptionId: args.selectedOptionId! }
          : { textAnswer: normalizeOptionalText(args.textAnswer)! }),
      },
    ].sort((left, right) => left.questionId.localeCompare(right.questionId));

    await ctx.db.patch(attempt._id, { answers });
    return null;
  },
});

export const submit = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    submissionMode: v.optional(submissionModeValidator),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const { attempt, quiz } = await getAttemptOrThrow(ctx, args.attemptId);

    if (attempt.candidateId !== user._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (attempt.status !== "in_progress") {
      return null;
    }

    const submissionMode =
      attempt.deadlineAt && attempt.deadlineAt <= Date.now()
        ? "timeout"
        : (args.submissionMode ?? "manual");

    await finalizeAttemptSubmission(ctx, attempt, quiz, submissionMode);
    return null;
  },
});

export const grade = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    grades: v.array(gradeInputValidator),
  },
  handler: async (ctx, args): Promise<null> => {
    const recruiter = await requireRole(ctx, "recruiter");
    const { attempt, quiz } = await getAttemptOrThrow(ctx, args.attemptId);

    if (quiz.type !== "recruitment") {
      throw new ConvexError("Only recruitment quizzes can be graded");
    }

    if (quiz.creatorId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (attempt.status !== "submitted") {
      throw new ConvexError("Only submitted attempts can be graded");
    }

    const gradeMap = new Map(
      args.grades.map((grade) => [
        grade.questionId,
        {
          awardedPoints: grade.awardedPoints,
          feedback: normalizeOptionalText(grade.feedback),
        },
      ])
    );
    const shortQuestions = quiz.questions.filter(
      (question) => question.type === "short_answer"
    );

    for (const question of shortQuestions) {
      if (!gradeMap.has(question.id)) {
        throw new ConvexError("All short answer questions must be graded");
      }
    }

    const answers = buildResultQuestions(quiz, attempt.answers).map((entry) => {
      if (entry.type !== "short_answer") {
        return (
          entry.answer ?? {
            questionId: entry.id,
            type: entry.type,
            awardedPoints: 0,
            isCorrect: false,
          }
        );
      }

      const grade = gradeMap.get(entry.id)!;

      if (grade.awardedPoints < 0 || grade.awardedPoints > entry.points) {
        throw new ConvexError(
          "Awarded points must stay within the question range"
        );
      }

      return {
        questionId: entry.id,
        type: entry.type,
        ...(entry.answer?.textAnswer
          ? { textAnswer: entry.answer.textAnswer }
          : {}),
        awardedPoints: grade.awardedPoints,
        ...(grade.feedback ? { feedback: grade.feedback } : {}),
      };
    });

    const manualScore = answers.reduce(
      (total, answer) =>
        total +
        (answer.type === "short_answer" ? (answer.awardedPoints ?? 0) : 0),
      0
    );
    const score = (attempt.autoScore ?? 0) + manualScore;
    const gradedAt = Date.now();

    await ctx.db.patch(attempt._id, {
      answers,
      manualScore,
      score,
      status: "graded",
      gradedAt,
      gradedBy: recruiter._id,
    });

    await notifyCandidateAboutGrading(ctx, attempt, quiz, score);
    return null;
  },
});

export const listAssignedForCandidate = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await requireRole(ctx, "candidate");
    const assignedApplications = await ctx.db
      .query("applications")
      .withIndex("by_candidate_and_status", (q) =>
        q.eq("candidateId", candidate._id).eq("status", "quiz_assigned")
      )
      .order("desc")
      .collect();
    const completedApplications = await ctx.db
      .query("applications")
      .withIndex("by_candidate_and_status", (q) =>
        q.eq("candidateId", candidate._id).eq("status", "quiz_completed")
      )
      .order("desc")
      .collect();
    const applications = [...assignedApplications, ...completedApplications]
      .filter((application) => application.assignedQuizId)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    return Promise.all(
      applications.map(async (application) => {
        const quiz = application.assignedQuizId
          ? await ctx.db.get(application.assignedQuizId)
          : null;
        const internship = await ctx.db.get(application.internshipId);
        const attempt = await ctx.db
          .query("quizAttempts")
          .withIndex("by_application", (q) =>
            q.eq("applicationId", application._id)
          )
          .unique();

        return {
          application,
          quiz: quiz
            ? {
                _id: quiz._id,
                title: quiz.title,
                description: quiz.description,
                timeLimit: quiz.timeLimit,
                questionCount: quiz.questions.length,
                maxScore: calculateMaxScore(quiz.questions),
              }
            : null,
          internship: internship
            ? {
                _id: internship._id,
                title: internship.title,
                company: internship.company,
              }
            : null,
          attempt: attempt
            ? {
                _id: attempt._id,
                status: attempt.status,
                score: attempt.score,
                maxScore: attempt.maxScore,
                deadlineAt: attempt.deadlineAt,
                submittedAt: attempt.submittedAt,
                gradedAt: attempt.gradedAt,
              }
            : null,
        };
      })
    );
  },
});

export const getCandidateAttempt = query({
  args: {
    quizId: v.id("quizzes"),
    applicationId: v.optional(v.id("applications")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz || !quiz.isPublished) {
      return null;
    }

    if (args.applicationId) {
      if (quiz.type !== "recruitment") {
        throw new ConvexError(
          "Application quizzes must be recruitment quizzes"
        );
      }

      const candidate = await requireRole(ctx, "candidate");
      const application = await ctx.db.get(args.applicationId);

      if (!application) {
        return null;
      }

      if (application.candidateId !== candidate._id) {
        throw new ConvexError("FORBIDDEN");
      }

      if (application.assignedQuizId !== quiz._id) {
        throw new ConvexError("Quiz not assigned to this application");
      }

      const internship = await ctx.db.get(application.internshipId);
      const attempt = await ctx.db
        .query("quizAttempts")
        .withIndex("by_application", (q) =>
          q.eq("applicationId", application._id)
        )
        .unique();

      return {
        quiz: sanitizeQuizForTaker(quiz),
        application: {
          _id: application._id,
          status: application.status,
          quizAssignedAt: application.quizAssignedAt,
        },
        internship: internship
          ? {
              _id: internship._id,
              title: internship.title,
              company: internship.company,
            }
          : null,
        attempt,
        hasExpired:
          attempt?.status === "in_progress" &&
          !!attempt.deadlineAt &&
          attempt.deadlineAt <= Date.now(),
      };
    }

    if (quiz.type !== "sample") {
      throw new ConvexError("Sample quizzes require a sample quiz id");
    }

    const attempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_candidate_and_quiz_and_attemptType", (q) =>
        q
          .eq("candidateId", user._id)
          .eq("quizId", quiz._id)
          .eq("attemptType", "sample")
      )
      .unique();

    return {
      quiz: sanitizeQuizForTaker(quiz),
      application: null,
      internship: null,
      attempt,
      hasExpired:
        attempt?.status === "in_progress" &&
        !!attempt.deadlineAt &&
        attempt.deadlineAt <= Date.now(),
    };
  },
});

export const getCandidateResult = query({
  args: {
    quizId: v.id("quizzes"),
    applicationId: v.optional(v.id("applications")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz || !quiz.isPublished) {
      return null;
    }

    let attempt: Doc<"quizAttempts"> | null = null;
    let application: Doc<"applications"> | null = null;
    let internship: Doc<"internships"> | null = null;

    if (args.applicationId) {
      const applicationDoc = await ctx.db.get(args.applicationId);

      if (!applicationDoc) {
        return null;
      }

      if (applicationDoc.candidateId !== user._id) {
        throw new ConvexError("FORBIDDEN");
      }

      if (applicationDoc.assignedQuizId !== quiz._id) {
        throw new ConvexError("Quiz not assigned to this application");
      }

      application = applicationDoc;
      attempt = await ctx.db
        .query("quizAttempts")
        .withIndex("by_application", (q) =>
          q.eq("applicationId", applicationDoc._id)
        )
        .unique();
      internship = await ctx.db.get(applicationDoc.internshipId);
    } else {
      attempt = await ctx.db
        .query("quizAttempts")
        .withIndex("by_candidate_and_quiz_and_attemptType", (q) =>
          q
            .eq("candidateId", user._id)
            .eq("quizId", quiz._id)
            .eq("attemptType", "sample")
        )
        .unique();
    }

    if (!attempt) {
      return null;
    }

    const pendingManualReview =
      attempt.status === "submitted" && hasManualQuestions(quiz.questions);

    return {
      quiz: pendingManualReview ? sanitizeQuizForTaker(quiz) : quiz,
      application: application
        ? {
            _id: application._id,
            status: application.status,
          }
        : null,
      internship: internship
        ? {
            _id: internship._id,
            title: internship.title,
            company: internship.company,
          }
        : null,
      attempt,
      pendingManualReview,
      questionBreakdown: pendingManualReview
        ? []
        : buildResultQuestions(quiz, attempt.answers),
    };
  },
});

export const listResultsForRecruiter = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz || quiz.type !== "recruitment") {
      return null;
    }

    if (quiz.creatorId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
      .order("desc")
      .collect();

    const results = await Promise.all(
      attempts.map(async (attempt) => {
        const candidate = await ctx.db.get(attempt.candidateId);
        const application = attempt.applicationId
          ? await ctx.db.get(attempt.applicationId)
          : null;
        const internship = application
          ? await ctx.db.get(application.internshipId)
          : null;

        return {
          attempt,
          candidate: candidate
            ? {
                _id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                imageUrl: candidate.imageUrl,
              }
            : null,
          application: application
            ? {
                _id: application._id,
                status: application.status,
                updatedAt: application.updatedAt,
              }
            : null,
          internship: internship
            ? {
                _id: internship._id,
                title: internship.title,
                company: internship.company,
              }
            : null,
        };
      })
    );

    return {
      quiz,
      results,
      pendingCount: attempts.filter((attempt) => attempt.status === "submitted")
        .length,
    };
  },
});
