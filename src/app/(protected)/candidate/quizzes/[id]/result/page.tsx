"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { useQuery } from "convex/react";

import {
  formatDate,
  formatPolicyViolationType,
  formatScore,
  formatSubmissionMode,
} from "@/components/quizzes/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function CandidateQuizResultPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const quizId = params.id as Id<"quizzes">;
  const applicationId = searchParams.get(
    "applicationId"
  ) as Id<"applications"> | null;
  const result = useQuery(api.quizAttempts.getCandidateResult, {
    quizId,
    applicationId: applicationId ?? undefined,
  });

  if (result === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Result unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/candidate/quizzes" as Route}>Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{result.quiz.title}</h1>
          <p className="text-muted-foreground">
            {result.internship?.title ?? "Quiz result"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={"/candidate/quizzes" as Route}>Back to quizzes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="text-3xl font-semibold text-foreground">
            {formatScore(result.attempt.score, result.attempt.maxScore)}
          </div>
          <p>
            Submitted {formatDate(result.attempt.submittedAt) ?? "just now"}
          </p>
          {result.attempt.gradedAt ? (
            <p>Graded {formatDate(result.attempt.gradedAt)}</p>
          ) : null}
          <p>
            Submission: {formatSubmissionMode(result.attempt.submissionMode)}
          </p>
        </CardContent>
      </Card>

      {result.attempt.submissionMode === "policy_violation" ? (
        <Card>
          <CardHeader>
            <CardTitle>Auto-submitted</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This quiz was submitted automatically because you{" "}
            {formatPolicyViolationType(
              result.attempt.policyViolationType
            )?.toLowerCase() ?? "left the quiz"}
            .
          </CardContent>
        </Card>
      ) : null}

      {result.pendingManualReview ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending manual grading</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your responses were submitted successfully. A recruiter still needs
            to grade the short answer questions before the final breakdown
            appears.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {result.questionBreakdown.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle className="text-base">
                  Question {index + 1}
                </CardTitle>
                <Badge variant="outline">
                  {question.answer?.awardedPoints ?? 0} / {question.points}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <p>{question.question}</p>

                {question.type === "multiple_choice" ? (
                  <>
                    <p className="text-muted-foreground">
                      Your answer:{" "}
                      {question.options?.find(
                        (option) =>
                          option.id === question.answer?.selectedOptionId
                      )?.text ?? "No answer submitted"}
                    </p>
                    <p className="text-muted-foreground">
                      Correct answer:{" "}
                      {question.options?.find(
                        (option) => option.id === question.correctOptionId
                      )?.text ?? "Unavailable"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      {question.answer?.textAnswer ?? "No answer submitted"}
                    </div>
                    {question.sampleAnswer ? (
                      <p className="text-muted-foreground">
                        Guidance: {question.sampleAnswer}
                      </p>
                    ) : null}
                    {question.answer?.feedback ? (
                      <p className="text-muted-foreground">
                        Feedback: {question.answer.feedback}
                      </p>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
