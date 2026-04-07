import { describe, expect, it } from "vitest";

import {
  type RecruiterQuizResultItem,
  getRecruiterQuizResultsBackLink,
  selectRecruiterQuizAttemptId,
} from "@/components/quizzes/recruiter-quiz-results";

function createResult(
  overrides?: Partial<RecruiterQuizResultItem>
): RecruiterQuizResultItem {
  return {
    attempt: {
      _id: "attempt-1",
      status: "graded",
    },
    application: null,
    internship: null,
    ...overrides,
  };
}

describe("selectRecruiterQuizAttemptId", () => {
  it("prefers the attempt id from the query string when it exists", () => {
    const results = [
      createResult({ attempt: { _id: "attempt-1", status: "graded" } }),
      createResult({ attempt: { _id: "attempt-2", status: "submitted" } }),
    ];

    expect(selectRecruiterQuizAttemptId(results, "attempt-2", null)).toBe(
      "attempt-2"
    );
  });

  it("falls back to the first submitted attempt when the query string id is invalid", () => {
    const results = [
      createResult({ attempt: { _id: "attempt-1", status: "graded" } }),
      createResult({ attempt: { _id: "attempt-2", status: "submitted" } }),
    ];

    expect(selectRecruiterQuizAttemptId(results, "missing-attempt", null)).toBe(
      "attempt-2"
    );
  });

  it("keeps the current selection when it is still present", () => {
    const results = [
      createResult({ attempt: { _id: "attempt-1", status: "graded" } }),
      createResult({ attempt: { _id: "attempt-2", status: "submitted" } }),
    ];

    expect(
      selectRecruiterQuizAttemptId(results, "attempt-2", "attempt-1")
    ).toBe("attempt-1");
  });
});

describe("getRecruiterQuizResultsBackLink", () => {
  it("returns the application review path for application-linked attempts", () => {
    expect(
      getRecruiterQuizResultsBackLink(
        createResult({
          application: { _id: "application-1" },
          internship: { _id: "internship-1" },
        })
      )
    ).toEqual({
      href: "/recruiter/internships/internship-1/applications/application-1",
      label: "Back to application review",
    });
  });

  it("falls back to the quizzes list for standalone attempts", () => {
    expect(getRecruiterQuizResultsBackLink(createResult())).toEqual({
      href: "/recruiter/quizzes",
      label: "Back to quizzes",
    });
  });
});
