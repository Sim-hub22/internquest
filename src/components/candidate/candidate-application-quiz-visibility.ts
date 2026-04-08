export type CandidateApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "quiz_assigned"
  | "quiz_completed"
  | "accepted"
  | "rejected";

type CandidateApplicationQuizVisibilityInput = {
  status: CandidateApplicationStatus;
  hasAssignedQuiz: boolean;
  hasQuizAttempt: boolean;
  quizAssignedAt?: number | null;
};

export function shouldShowCandidateApplicationQuizCard({
  status,
  hasAssignedQuiz,
  hasQuizAttempt,
  quizAssignedAt,
}: CandidateApplicationQuizVisibilityInput) {
  if (status === "quiz_assigned" || status === "quiz_completed") {
    return true;
  }

  return hasAssignedQuiz || hasQuizAttempt || quizAssignedAt != null;
}
