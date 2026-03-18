"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  formatDate,
  formatMinutesLabel,
  formatScore,
} from "@/components/quizzes/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type GradeDraft = {
  awardedPoints: string;
  feedback: string;
};

export default function RecruiterQuizResultsPage() {
  const params = useParams<{ id: string }>();
  const quizId = params.id as Id<"quizzes">;
  const results = useQuery(api.quizAttempts.listResultsForRecruiter, {
    quizId,
  });
  const gradeAttempt = useMutation(api.quizAttempts.grade);
  const [selectedAttemptId, setSelectedAttemptId] =
    useState<Id<"quizAttempts"> | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!results?.results.length) {
      return;
    }

    setSelectedAttemptId((current) => {
      if (current) {
        return current;
      }

      return (
        results.results.find((item) => item.attempt.status === "submitted")
          ?.attempt._id ?? results.results[0]!.attempt._id
      );
    });
  }, [results]);

  useEffect(() => {
    if (!results || !selectedAttemptId) {
      return;
    }

    const selected = results.results.find(
      (item) => item.attempt._id === selectedAttemptId
    );

    if (!selected) {
      return;
    }

    const nextDrafts: Record<string, GradeDraft> = {};

    for (const answer of selected.attempt.answers) {
      if (answer.type === "short_answer") {
        nextDrafts[answer.questionId] = {
          awardedPoints:
            answer.awardedPoints !== undefined
              ? String(answer.awardedPoints)
              : "",
          feedback: answer.feedback ?? "",
        };
      }
    }

    setGradeDrafts(nextDrafts);
  }, [results, selectedAttemptId]);

  if (results === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Quiz Results</h1>
            <p className="text-muted-foreground">
              Review attempts and grade short answer submissions.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={"/recruiter/quizzes" as Route}>Back to quizzes</Link>
          </Button>
        </div>

        <Empty>
          <EmptyHeader>
            <EmptyTitle>No attempts yet</EmptyTitle>
            <EmptyDescription>
              Results will appear here as candidates take this quiz.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const selected =
    results.results.find((item) => item.attempt._id === selectedAttemptId) ??
    results.results[0]!;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{results.quiz.title}</h1>
          <p className="text-muted-foreground">
            {results.quiz.questions.length} questions ·{" "}
            {formatMinutesLabel(results.quiz.timeLimit)} ·{" "}
            {results.pendingCount} pending review
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={"/recruiter/quizzes" as Route}>Back to quizzes</Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          {results.results.map((item) => (
            <Card
              key={item.attempt._id}
              className={
                item.attempt._id === selected.attempt._id
                  ? "border-primary"
                  : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {item.candidate?.name ?? "Unknown candidate"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {item.internship?.title ?? "Application attempt"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.attempt.status === "submitted"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {item.attempt.status === "submitted"
                      ? "Needs grading"
                      : "Complete"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>{formatScore(item.attempt.score, item.attempt.maxScore)}</p>
                <p>
                  Submitted {formatDate(item.attempt.submittedAt) ?? "just now"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedAttemptId(item.attempt._id)}
                >
                  Review Attempt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selected.candidate?.name ?? "Candidate"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{selected.candidate?.email ?? "No email"}</span>
              <span>
                {selected.internship?.title ?? "Sample / standalone quiz"}
              </span>
              <span>
                Submitted{" "}
                {formatDate(selected.attempt.submittedAt) ?? "just now"}
              </span>
            </CardContent>
          </Card>

          {results.quiz.questions.map((question, index) => {
            const answer =
              selected.attempt.answers.find(
                (item) => item.questionId === question.id
              ) ?? null;

            return (
              <Card key={question.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    Question {index + 1}
                  </CardTitle>
                  <Badge variant="outline">{question.points} pts</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  <p>{question.question}</p>

                  {question.type === "multiple_choice" ? (
                    <>
                      <p className="text-muted-foreground">
                        Selected:{" "}
                        {question.options?.find(
                          (option) => option.id === answer?.selectedOptionId
                        )?.text ?? "No answer submitted"}
                      </p>
                      <p className="text-muted-foreground">
                        Correct:{" "}
                        {question.options?.find(
                          (option) => option.id === question.correctOptionId
                        )?.text ?? "Unavailable"}
                      </p>
                      <Badge variant="secondary">
                        {answer?.awardedPoints ?? 0} / {question.points}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        {answer?.textAnswer ?? "No answer submitted"}
                      </div>
                      {question.sampleAnswer ? (
                        <p className="text-muted-foreground">
                          Guidance: {question.sampleAnswer}
                        </p>
                      ) : null}

                      {selected.attempt.status === "submitted" ? (
                        <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                          <Input
                            type="number"
                            min={0}
                            max={question.points}
                            placeholder="Points"
                            value={
                              gradeDrafts[question.id]?.awardedPoints ?? ""
                            }
                            onChange={(event) =>
                              setGradeDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  awardedPoints: event.target.value,
                                  feedback:
                                    current[question.id]?.feedback ?? "",
                                },
                              }))
                            }
                          />
                          <Textarea
                            rows={3}
                            placeholder="Optional feedback"
                            value={gradeDrafts[question.id]?.feedback ?? ""}
                            onChange={(event) =>
                              setGradeDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  awardedPoints:
                                    current[question.id]?.awardedPoints ?? "",
                                  feedback: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 text-muted-foreground">
                          <span>
                            Score: {answer?.awardedPoints ?? 0} /{" "}
                            {question.points}
                          </span>
                          {answer?.feedback ? (
                            <span>Feedback: {answer.feedback}</span>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {selected.attempt.status === "submitted" ? (
            <div className="flex justify-end">
              <Button
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await gradeAttempt({
                      attemptId: selected.attempt._id,
                      grades: results.quiz.questions
                        .filter((question) => question.type === "short_answer")
                        .map((question) => ({
                          questionId: question.id,
                          awardedPoints: Number(
                            gradeDrafts[question.id]?.awardedPoints ?? "0"
                          ),
                          feedback:
                            gradeDrafts[question.id]?.feedback || undefined,
                        })),
                    });
                    toast.success("Quiz graded successfully");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to grade attempt";
                    toast.error(message);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Submit Grades
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
