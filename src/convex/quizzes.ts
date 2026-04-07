import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { requireAnyRole, requireRole } from "@/convex/lib/auth";
import { createNotification } from "@/convex/lib/notifications";
import {
  type QuizQuestion,
  type QuizType,
  calculateMaxScore,
  hasManualQuestions,
  normalizeDraftQuizQuestions,
  normalizeOptionalText,
  normalizeQuizQuestions,
  quizQuestionValidator,
  quizTypeValidator,
} from "@/convex/lib/quizzes";

const APP_URL = process.env.APP_URL?.replace(/\/$/, "") ?? "";

function buildCandidateQuizPath(
  quizId: Id<"quizzes">,
  applicationId: Id<"applications">
) {
  return `/candidate/quizzes/${quizId}?applicationId=${applicationId}`;
}

function buildAbsoluteUrl(path: string) {
  return APP_URL ? `${APP_URL}${path}` : path;
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

function buildQuizForOwnerPreview(quiz: Doc<"quizzes">) {
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
      ...(question.correctOptionId
        ? { correctOptionId: question.correctOptionId }
        : {}),
      ...(question.sampleAnswer ? { sampleAnswer: question.sampleAnswer } : {}),
    })),
  };
}

async function getQuizAttemptStats(
  ctx: QueryCtx,
  quizId: Id<"quizzes">
): Promise<{
  totalAttempts: number;
  gradedAttempts: number;
}> {
  let totalAttempts = 0;
  let gradedAttempts = 0;

  for await (const attempt of ctx.db
    .query("quizAttempts")
    .withIndex("by_quiz", (q) => q.eq("quizId", quizId))) {
    totalAttempts += 1;

    if (attempt.status === "graded") {
      gradedAttempts += 1;
    }
  }

  return {
    totalAttempts,
    gradedAttempts,
  };
}

async function getRecruitmentQuizForOwner(
  recruiterId: Id<"users">,
  quizId: Id<"quizzes">,
  ctx: QueryCtx | MutationCtx
) {
  const quiz = await ctx.db.get(quizId);

  if (!quiz || quiz.type !== "recruitment") {
    throw new ConvexError("Quiz not found");
  }

  if (quiz.creatorId !== recruiterId) {
    throw new ConvexError("FORBIDDEN");
  }

  return quiz;
}

async function getSampleQuizForOwner(
  adminId: Id<"users">,
  quizId: Id<"quizzes">,
  ctx: QueryCtx | MutationCtx
) {
  const quiz = await ctx.db.get(quizId);

  if (!quiz || quiz.type !== "sample") {
    throw new ConvexError("Quiz not found");
  }

  if (quiz.creatorId !== adminId) {
    throw new ConvexError("FORBIDDEN");
  }

  return quiz;
}

function createStatusHistoryEntry(
  status: "quiz_assigned",
  userId: Id<"users">,
  changedAt: number
) {
  return {
    status,
    changedAt,
    changedBy: userId,
  };
}

function buildQuizDocument(args: {
  creatorId: Id<"users">;
  title: string;
  description?: string;
  type: QuizType;
  internshipId?: Id<"internships">;
  timeLimit?: number;
  questions: QuizQuestion[];
  isPublished?: boolean;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    creatorId: args.creatorId,
    title: args.title.trim(),
    ...(args.description ? { description: args.description } : {}),
    type: args.type,
    ...(args.internshipId ? { internshipId: args.internshipId } : {}),
    ...(args.timeLimit ? { timeLimit: args.timeLimit } : {}),
    questions: args.questions,
    isPublished: args.isPublished ?? false,
    ...(args.publishedAt ? { publishedAt: args.publishedAt } : {}),
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  };
}

async function assertQuizUnused(
  ctx: MutationCtx,
  quizId: Id<"quizzes">,
  action: "edit" | "delete"
): Promise<null> {
  const [assignedApplication] = await ctx.db
    .query("applications")
    .withIndex("by_assigned_quiz", (q) => q.eq("assignedQuizId", quizId))
    .take(1);
  const [attempt] = await ctx.db
    .query("quizAttempts")
    .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
    .take(1);

  if (assignedApplication || attempt) {
    throw new ConvexError(
      action === "edit"
        ? "Quizzes cannot be edited after they have been assigned or attempted"
        : "Quizzes cannot be deleted after they have been assigned or attempted"
    );
  }

  return null;
}

async function getQuizDeleteState(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">
) {
  const [assignedApplication] = await ctx.db
    .query("applications")
    .withIndex("by_assigned_quiz", (q) => q.eq("assignedQuizId", quizId))
    .take(1);
  const [attempt] = await ctx.db
    .query("quizAttempts")
    .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
    .take(1);

  const canDelete = !assignedApplication && !attempt;

  return {
    canDelete,
    deleteDisabledReason: canDelete
      ? null
      : "This quiz has already been assigned or attempted, so it must stay in history.",
  };
}

function assertQuizQuestionsSupported(
  type: QuizType,
  questions: QuizQuestion[]
) {
  if (type === "sample" && hasManualQuestions(questions)) {
    throw new ConvexError(
      "Sample quizzes can only include multiple choice questions"
    );
  }
}

function getDraftTitle(title: string) {
  return normalizeOptionalText(title) ?? "Untitled quiz";
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: quizTypeValidator,
    draft: v.optional(v.boolean()),
    internshipId: v.optional(v.id("internships")),
    timeLimit: v.optional(v.number()),
    questions: v.array(quizQuestionValidator),
  },
  handler: async (ctx, args) => {
    const owner =
      args.type === "sample"
        ? await requireRole(ctx, "admin")
        : await requireRole(ctx, "recruiter");

    if (args.type === "sample" && args.internshipId) {
      throw new ConvexError("Sample quizzes cannot be linked to internships");
    }

    if (args.type === "recruitment" && args.internshipId) {
      const internship = await ctx.db.get(args.internshipId);

      if (!internship) {
        throw new ConvexError("Internship not found");
      }

      if (internship.recruiterId !== owner._id) {
        throw new ConvexError("FORBIDDEN");
      }
    }

    const isDraft = args.draft ?? false;
    const title = normalizeOptionalText(args.title);
    const description = normalizeOptionalText(args.description);
    const questions = isDraft
      ? normalizeDraftQuizQuestions(args.questions)
      : normalizeQuizQuestions(args.questions);

    if (!isDraft) {
      assertQuizQuestionsSupported(args.type, questions);
    }

    if (!title && !isDraft) {
      throw new ConvexError("Quiz title is required");
    }

    if (args.timeLimit !== undefined && args.timeLimit <= 0) {
      throw new ConvexError("Time limit must be greater than zero");
    }

    const now = Date.now();

    return await ctx.db.insert(
      "quizzes",
      buildQuizDocument({
        creatorId: owner._id,
        title: isDraft ? getDraftTitle(args.title) : title!,
        description,
        type: args.type,
        internshipId: args.internshipId,
        timeLimit: args.timeLimit,
        questions,
        createdAt: now,
        updatedAt: now,
      })
    );
  },
});

export const update = mutation({
  args: {
    quizId: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    draft: v.optional(v.boolean()),
    internshipId: v.optional(v.id("internships")),
    timeLimit: v.optional(v.number()),
    questions: v.array(quizQuestionValidator),
  },
  handler: async (ctx, args): Promise<null> => {
    const existing = await ctx.db.get(args.quizId);

    if (!existing) {
      throw new ConvexError("Quiz not found");
    }

    const owner =
      existing.type === "sample"
        ? await requireRole(ctx, "admin")
        : await requireRole(ctx, "recruiter");

    if (existing.creatorId !== owner._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (existing.type === "sample" && args.internshipId) {
      throw new ConvexError("Sample quizzes cannot be linked to internships");
    }

    if (existing.type === "recruitment" && args.internshipId) {
      const internship = await ctx.db.get(args.internshipId);

      if (!internship) {
        throw new ConvexError("Internship not found");
      }

      if (internship.recruiterId !== owner._id) {
        throw new ConvexError("FORBIDDEN");
      }
    }

    const isDraft = (args.draft ?? false) && !existing.isPublished;
    const title = normalizeOptionalText(args.title);
    const description = normalizeOptionalText(args.description);
    const questions = isDraft
      ? normalizeDraftQuizQuestions(args.questions)
      : normalizeQuizQuestions(args.questions);

    await assertQuizUnused(ctx, existing._id, "edit");
    if (!isDraft) {
      assertQuizQuestionsSupported(existing.type, questions);
    }

    if (!title && !isDraft) {
      throw new ConvexError("Quiz title is required");
    }

    if (args.timeLimit !== undefined && args.timeLimit <= 0) {
      throw new ConvexError("Time limit must be greater than zero");
    }

    await ctx.db.replace("quizzes", args.quizId, {
      ...buildQuizDocument({
        creatorId: existing.creatorId,
        title: isDraft ? getDraftTitle(args.title) : title!,
        description,
        type: existing.type,
        internshipId: args.internshipId,
        timeLimit: args.timeLimit,
        questions,
        isPublished: existing.isPublished,
        publishedAt: existing.publishedAt,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      }),
    });

    return null;
  },
});

export const publish = mutation({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args): Promise<null> => {
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz) {
      throw new ConvexError("Quiz not found");
    }

    if (quiz.type === "sample") {
      const admin = await requireRole(ctx, "admin");

      if (quiz.creatorId !== admin._id) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      const recruiter = await requireRole(ctx, "recruiter");

      if (quiz.creatorId !== recruiter._id) {
        throw new ConvexError("FORBIDDEN");
      }
    }

    const title = normalizeOptionalText(quiz.title);
    const questions = normalizeQuizQuestions(quiz.questions);

    if (!title) {
      throw new ConvexError("Quiz title is required");
    }

    if (questions.length === 0 || calculateMaxScore(questions) <= 0) {
      throw new ConvexError(
        "Published quizzes need at least one valid question"
      );
    }

    assertQuizQuestionsSupported(quiz.type, questions);

    const now = Date.now();
    await ctx.db.patch(args.quizId, {
      title,
      questions,
      isPublished: true,
      publishedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args): Promise<null> => {
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz) {
      throw new ConvexError("Quiz not found");
    }

    if (quiz.type === "sample") {
      const admin = await requireRole(ctx, "admin");

      if (quiz.creatorId !== admin._id) {
        throw new ConvexError("FORBIDDEN");
      }
    } else {
      const recruiter = await requireRole(ctx, "recruiter");

      if (quiz.creatorId !== recruiter._id) {
        throw new ConvexError("FORBIDDEN");
      }
    }

    await assertQuizUnused(ctx, quiz._id, "delete");
    await ctx.db.delete(quiz._id);

    return null;
  },
});

export const listForRecruiter = query({
  args: {
    publishedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");

    const quizzes = args.publishedOnly
      ? await ctx.db
          .query("quizzes")
          .withIndex("by_creator_and_type_and_published", (q) =>
            q
              .eq("creatorId", recruiter._id)
              .eq("type", "recruitment")
              .eq("isPublished", true)
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("quizzes")
          .withIndex("by_creator_and_type", (q) =>
            q.eq("creatorId", recruiter._id).eq("type", "recruitment")
          )
          .order("desc")
          .collect();

    return Promise.all(
      quizzes.map(async (quiz) => {
        const deleteState = await getQuizDeleteState(ctx, quiz._id);
        const attemptStats = await getQuizAttemptStats(ctx, quiz._id);

        return {
          ...quiz,
          questionCount: quiz.questions.length,
          maxScore: calculateMaxScore(quiz.questions),
          ...attemptStats,
          ...deleteState,
        };
      })
    );
  },
});

export const getForRecruiter = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const quiz = await getRecruitmentQuizForOwner(
      recruiter._id,
      args.quizId,
      ctx
    );

    const internship = quiz.internshipId
      ? await ctx.db.get(quiz.internshipId)
      : null;

    return {
      ...quiz,
      internship,
      maxScore: calculateMaxScore(quiz.questions),
    };
  },
});

export const listForAdmin = query({
  args: {
    publishedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    const quizzes = args.publishedOnly
      ? await ctx.db
          .query("quizzes")
          .withIndex("by_creator_and_type_and_published", (q) =>
            q
              .eq("creatorId", admin._id)
              .eq("type", "sample")
              .eq("isPublished", true)
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("quizzes")
          .withIndex("by_creator_and_type", (q) =>
            q.eq("creatorId", admin._id).eq("type", "sample")
          )
          .order("desc")
          .collect();

    return Promise.all(
      quizzes.map(async (quiz) => {
        const deleteState = await getQuizDeleteState(ctx, quiz._id);

        return {
          ...quiz,
          questionCount: quiz.questions.length,
          maxScore: calculateMaxScore(quiz.questions),
          ...deleteState,
        };
      })
    );
  },
});

export const getForAdmin = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const quiz = await getSampleQuizForOwner(admin._id, args.quizId, ctx);

    return {
      ...quiz,
      maxScore: calculateMaxScore(quiz.questions),
    };
  },
});

export const getOwnerPreview = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz) {
      return null;
    }

    const user = await requireAnyRole(ctx, ["admin", "recruiter"]);

    if (quiz.type === "sample") {
      if (user.role !== "admin" || quiz.creatorId !== user._id) {
        throw new ConvexError("FORBIDDEN");
      }
    } else if (user.role !== "recruiter" || quiz.creatorId !== user._id) {
      throw new ConvexError("FORBIDDEN");
    }

    return {
      quiz: buildQuizForOwnerPreview(quiz),
      questionCount: quiz.questions.length,
      maxScore: calculateMaxScore(quiz.questions),
    };
  },
});

export const listPublishedSamples = query({
  args: {},
  handler: async (ctx) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_type_and_published", (q) =>
        q.eq("type", "sample").eq("isPublished", true)
      )
      .order("desc")
      .collect();

    return quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      publishedAt: quiz.publishedAt,
      questionCount: quiz.questions.length,
      maxScore: calculateMaxScore(quiz.questions),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    }));
  },
});

export const getPublishedSample = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);

    if (!quiz || quiz.type !== "sample" || !quiz.isPublished) {
      return null;
    }

    const user = await requireAnyRole(ctx, [
      "candidate",
      "recruiter",
      "admin",
    ]).catch(() => null);

    const existingAttempt = user
      ? await ctx.db
          .query("quizAttempts")
          .withIndex("by_candidate_and_quiz_and_attemptType", (q) =>
            q
              .eq("candidateId", user._id)
              .eq("quizId", quiz._id)
              .eq("attemptType", "sample")
          )
          .unique()
      : null;

    return {
      quiz: sanitizeQuizForTaker(quiz),
      questionCount: quiz.questions.length,
      maxScore: calculateMaxScore(quiz.questions),
      viewerAttempt: existingAttempt
        ? {
            _id: existingAttempt._id,
            status: existingAttempt.status,
            score: existingAttempt.score,
            maxScore: existingAttempt.maxScore,
            submittedAt: existingAttempt.submittedAt,
            gradedAt: existingAttempt.gradedAt,
          }
        : null,
    };
  },
});

export const assignToApplication = mutation({
  args: {
    applicationId: v.id("applications"),
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args): Promise<null> => {
    const recruiter = await requireRole(ctx, "recruiter");
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      throw new ConvexError("Application not found");
    }

    const internship = await ctx.db.get(application.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (application.status !== "shortlisted") {
      throw new ConvexError(
        "Only shortlisted applications can receive quizzes"
      );
    }

    if (application.assignedQuizId) {
      throw new ConvexError("This application already has an assigned quiz");
    }

    const quiz = await getRecruitmentQuizForOwner(
      recruiter._id,
      args.quizId,
      ctx
    );

    if (!quiz.isPublished) {
      throw new ConvexError("Only published quizzes can be assigned");
    }

    if (quiz.internshipId && quiz.internshipId !== internship._id) {
      throw new ConvexError("Quiz does not belong to this internship");
    }

    const candidate = await ctx.db.get(application.candidateId);

    if (!candidate) {
      throw new ConvexError("Candidate not found");
    }

    const assignedAt = Date.now();
    const quizPath = buildCandidateQuizPath(quiz._id, application._id);

    await ctx.db.patch(application._id, {
      assignedQuizId: quiz._id,
      quizAssignedAt: assignedAt,
      status: "quiz_assigned",
      statusHistory: [
        ...application.statusHistory,
        createStatusHistoryEntry("quiz_assigned", recruiter._id, assignedAt),
      ],
      updatedAt: assignedAt,
    });

    await createNotification(ctx, {
      userId: candidate._id,
      type: "quiz_assigned",
      title: `Quiz assigned for ${internship.title}`,
      message: `${quiz.title} is ready to take for your ${internship.title} application.`,
      link: quizPath,
      relatedId: application._id,
    });

    if (candidate.email) {
      await ctx.scheduler.runAfter(
        0,
        internal.emailActions.sendQuizAssignedEmail,
        {
          to: candidate.email,
          name: candidate.name,
          internshipTitle: internship.title,
          quizTitle: quiz.title,
          quizUrl: buildAbsoluteUrl(quizPath),
        }
      );
    }

    return null;
  },
});
