type AttemptSummary = {
  _id: string;
  status: string;
};

type ApplicationSummary = {
  _id: string;
} | null;

type InternshipSummary = {
  _id: string;
} | null;

export type RecruiterQuizResultItem = {
  attempt: AttemptSummary;
  application: ApplicationSummary;
  internship: InternshipSummary;
};

export function selectRecruiterQuizAttemptId(
  results: RecruiterQuizResultItem[],
  preferredAttemptId: string | null,
  currentAttemptId: string | null
) {
  if (results.length === 0) {
    return null;
  }

  if (
    currentAttemptId &&
    results.some((item) => item.attempt._id === currentAttemptId)
  ) {
    return currentAttemptId;
  }

  if (
    preferredAttemptId &&
    results.some((item) => item.attempt._id === preferredAttemptId)
  ) {
    return preferredAttemptId;
  }

  return (
    results.find((item) => item.attempt.status === "submitted")?.attempt._id ??
    results[0]!.attempt._id
  );
}

export function getRecruiterQuizResultsBackLink(
  selectedResult: RecruiterQuizResultItem
) {
  if (selectedResult.application?._id && selectedResult.internship?._id) {
    return {
      href: `/recruiter/internships/${selectedResult.internship._id}/applications/${selectedResult.application._id}`,
      label: "Back to application review",
    };
  }

  return {
    href: "/recruiter/quizzes",
    label: "Back to quizzes",
  };
}
