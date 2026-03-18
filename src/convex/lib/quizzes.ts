import { ConvexError, v } from "convex/values";

export const quizTypeValidator = v.union(
  v.literal("recruitment"),
  v.literal("sample")
);

export const questionTypeValidator = v.union(
  v.literal("multiple_choice"),
  v.literal("short_answer")
);

export const quizOptionValidator = v.object({
  id: v.string(),
  text: v.string(),
});

export const quizQuestionValidator = v.object({
  id: v.string(),
  type: questionTypeValidator,
  question: v.string(),
  points: v.number(),
  options: v.optional(v.array(quizOptionValidator)),
  correctOptionId: v.optional(v.string()),
  sampleAnswer: v.optional(v.string()),
});

export const quizAnswerValidator = v.object({
  questionId: v.string(),
  type: questionTypeValidator,
  selectedOptionId: v.optional(v.string()),
  textAnswer: v.optional(v.string()),
  awardedPoints: v.optional(v.number()),
  feedback: v.optional(v.string()),
  isCorrect: v.optional(v.boolean()),
});

export const attemptTypeValidator = v.union(
  v.literal("application"),
  v.literal("sample")
);

export const attemptStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("submitted"),
  v.literal("graded")
);

export const submissionModeValidator = v.union(
  v.literal("manual"),
  v.literal("timeout")
);

export type QuizType = "recruitment" | "sample";
export type QuizQuestionType = "multiple_choice" | "short_answer";
export type AttemptType = "application" | "sample";
export type AttemptStatus = "in_progress" | "submitted" | "graded";
export type SubmissionMode = "manual" | "timeout";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  points: number;
  options?: QuizOption[];
  correctOptionId?: string;
  sampleAnswer?: string;
};

export type QuizAnswer = {
  questionId: string;
  type: QuizQuestionType;
  selectedOptionId?: string;
  textAnswer?: string;
  awardedPoints?: number;
  feedback?: string;
  isCorrect?: boolean;
};

export function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeQuizQuestions(
  questions: QuizQuestion[]
): QuizQuestion[] {
  if (questions.length === 0) {
    throw new ConvexError("A quiz must include at least one question");
  }

  const seenQuestionIds = new Set<string>();

  return questions.map((question, index) => {
    const questionId = question.id.trim();
    const prompt = question.question.trim();
    const sampleAnswer = normalizeOptionalText(question.sampleAnswer);

    if (!questionId) {
      throw new ConvexError(`Question ${index + 1} must have an id`);
    }

    if (seenQuestionIds.has(questionId)) {
      throw new ConvexError("Question ids must be unique");
    }

    seenQuestionIds.add(questionId);

    if (!prompt) {
      throw new ConvexError(`Question ${index + 1} must have text`);
    }

    if (question.points <= 0) {
      throw new ConvexError("Question points must be greater than zero");
    }

    if (question.type === "multiple_choice") {
      const options =
        question.options?.map((option) => ({
          id: option.id.trim(),
          text: option.text.trim(),
        })) ?? [];

      if (options.length < 2) {
        throw new ConvexError(
          "Multiple choice questions need at least two options"
        );
      }

      const seenOptionIds = new Set<string>();
      for (const option of options) {
        if (!option.id || !option.text) {
          throw new ConvexError(
            "Multiple choice options must include an id and label"
          );
        }

        if (seenOptionIds.has(option.id)) {
          throw new ConvexError("Option ids must be unique per question");
        }

        seenOptionIds.add(option.id);
      }

      if (
        !question.correctOptionId ||
        !seenOptionIds.has(question.correctOptionId)
      ) {
        throw new ConvexError(
          "Multiple choice questions must include a valid correct answer"
        );
      }

      return {
        id: questionId,
        type: question.type,
        question: prompt,
        points: question.points,
        options,
        correctOptionId: question.correctOptionId,
      };
    }

    return {
      id: questionId,
      type: question.type,
      question: prompt,
      points: question.points,
      ...(sampleAnswer ? { sampleAnswer } : {}),
    };
  });
}

export function calculateMaxScore(questions: QuizQuestion[]) {
  return questions.reduce((total, question) => total + question.points, 0);
}

export function hasManualQuestions(questions: QuizQuestion[]) {
  return questions.some((question) => question.type === "short_answer");
}

export function toQuestionMap(questions: QuizQuestion[]) {
  return new Map(questions.map((question) => [question.id, question]));
}

export function getAnswerMap(answers: QuizAnswer[]) {
  return new Map(answers.map((answer) => [answer.questionId, answer]));
}
