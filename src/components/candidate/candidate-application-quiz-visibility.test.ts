import { describe, expect, it } from "vitest";

import { shouldShowCandidateApplicationQuizCard } from "@/components/candidate/candidate-application-quiz-visibility";

describe("shouldShowCandidateApplicationQuizCard", () => {
  it("keeps the quiz card visible for accepted applications with prior quiz data", () => {
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "accepted",
        hasAssignedQuiz: true,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(true);

    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "accepted",
        hasAssignedQuiz: false,
        hasQuizAttempt: true,
        quizAssignedAt: null,
      })
    ).toBe(true);

    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "accepted",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: Date.now(),
      })
    ).toBe(true);
  });

  it("hides the quiz card for accepted applications without quiz data", () => {
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "accepted",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(false);
  });

  it("shows the quiz card during the quiz_assigned stage", () => {
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "quiz_assigned",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(true);
  });

  it("shows the quiz card during the quiz_completed stage", () => {
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "quiz_completed",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(true);
  });

  it("hides the quiz card for non-quiz stages without quiz data", () => {
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "applied",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(false);

    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "under_review",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(false);

    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "shortlisted",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(false);
    expect(
      shouldShowCandidateApplicationQuizCard({
        status: "rejected",
        hasAssignedQuiz: false,
        hasQuizAttempt: false,
        quizAssignedAt: null,
      })
    ).toBe(false);
  });
});
