"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  formatDate,
  formatMinutesLabel,
  formatScore,
  formatTimeRemaining,
} from "@/components/quizzes/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export default function PublicSampleQuizDetailPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const quizId = params.id as Id<"quizzes">;
  const currentUser = useQuery(api.users.current, {});
  const sample = useQuery(api.quizzes.getPublishedSample, { quizId });
  const session = useQuery(
    api.quizAttempts.getCandidateAttempt,
    currentUser ? { quizId } : "skip"
  );
  const result = useQuery(
    api.quizAttempts.getCandidateResult,
    currentUser ? { quizId } : "skip"
  );
  const startAttempt = useMutation(api.quizAttempts.start);
  const saveAnswer = useMutation(api.quizAttempts.saveAnswer);
  const submitAttempt = useMutation(api.quizAttempts.submit);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [hasRequestedStart, setHasRequestedStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!session?.attempt?.answers) {
      return;
    }

    const nextDrafts: Record<string, string> = {};

    for (const answer of session.attempt.answers) {
      nextDrafts[answer.questionId] =
        answer.selectedOptionId ?? answer.textAnswer ?? "";
    }

    setAnswerDrafts(nextDrafts);
  }, [session?.attempt]);

  useEffect(() => {
    if (
      !currentUser ||
      !session ||
      session.attempt ||
      hasRequestedStart ||
      result !== null
    ) {
      return;
    }

    setHasRequestedStart(true);
    startAttempt({ quizId }).catch((error) => {
      const message =
        error instanceof Error ? error.message : "Failed to start sample quiz";
      toast.error(message);
      setHasRequestedStart(false);
    });
  }, [currentUser, hasRequestedStart, quizId, result, session, startAttempt]);

  useEffect(() => {
    if (
      !session?.attempt ||
      session.attempt.status !== "in_progress" ||
      !session.hasExpired ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    submitAttempt({
      attemptId: session.attempt._id,
      submissionMode: "timeout",
    })
      .then(() => router.refresh())
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to submit sample quiz";
        toast.error(message);
      })
      .finally(() => setIsSubmitting(false));
  }, [isSubmitting, router, session, submitAttempt, tick]);

  if (sample === undefined || currentUser === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 lg:px-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (!sample) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/resources/quizzes" as Route}>
                Back to resources
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const signInHref =
    `/sign-in?redirect_url=${encodeURIComponent(pathname)}` as Route;

  const persistShortAnswer = async (
    attemptId: Id<"quizAttempts">,
    questionId: string,
    value: string,
    showError = true
  ) => {
    try {
      await saveAnswer({
        attemptId,
        questionId,
        textAnswer: value,
      });
    } catch (error) {
      if (!showError) {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Failed to save answer";
      toast.error(message);
    }
  };

  const previewCards = sample.quiz.questions.map((question, index) => (
    <Card key={question.id}>
      <CardHeader>
        <CardTitle className="text-base">
          Question {index + 1} - {question.points} pts
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">{question.question}</p>

        {question.type === "multiple_choice" ? (
          <div className="grid gap-3">
            {question.options?.map((option) => (
              <div
                key={option.id}
                className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2 text-sm"
              >
                {option.text}
              </div>
            ))}
          </div>
        ) : (
          <Textarea
            rows={6}
            disabled
            placeholder="Sign in to answer this question."
          />
        )}
      </CardContent>
    </Card>
  ));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {sample.quiz.title}
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            {sample.quiz.description ?? "Public sample quiz"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{sample.questionCount} questions</Badge>
          <Badge variant="outline">
            {formatMinutesLabel(sample.quiz.timeLimit)}
          </Badge>
          <Badge variant="outline">
            {currentUser
              ? formatScore(sample.viewerAttempt?.score, sample.maxScore)
              : `${sample.maxScore} max points`}
          </Badge>
        </div>
      </div>

      {!currentUser ? (
        <div className="flex flex-col gap-4">
          <Card className="border-border/70 bg-muted/10">
            <CardHeader>
              <CardTitle>Preview mode</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-muted-foreground">
                Read every question before you commit. Sign in when you are
                ready for the timed practice flow, automatic submission, and
                saved results.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={signInHref}>Sign in to practice</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={"/resources/quizzes" as Route}>
                    Back to quizzes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {previewCards}
        </div>
      ) : result && result.attempt.status !== "in_progress" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Quiz Result</CardTitle>
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
              {result.pendingManualReview ? (
                <p>
                  Manual grading is still in progress, so the detailed breakdown
                  will appear later.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {!result.pendingManualReview
            ? result.questionBreakdown.map((question, index) => (
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
                        {question.answer?.feedback ? (
                          <p className="text-muted-foreground">
                            Feedback: {question.answer.feedback}
                          </p>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            : null}
        </div>
      ) : session?.attempt ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            {session.attempt.deadlineAt ? (
              <Badge>{formatTimeRemaining(session.attempt.deadlineAt)}</Badge>
            ) : null}
          </div>

          {session.quiz.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Question {index + 1} - {question.points} pts
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm">{question.question}</p>

                {question.type === "multiple_choice" ? (
                  <div className="grid gap-3">
                    {question.options?.map((option) => {
                      const isSelected =
                        answerDrafts[question.id] === option.id;

                      return (
                        <Button
                          key={option.id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "justify-start",
                            isSelected && "shadow-sm"
                          )}
                          onClick={async () => {
                            setAnswerDrafts((current) => ({
                              ...current,
                              [question.id]: option.id,
                            }));

                            try {
                              await saveAnswer({
                                attemptId: session.attempt!._id,
                                questionId: question.id,
                                selectedOptionId: option.id,
                              });
                            } catch (error) {
                              const message =
                                error instanceof Error
                                  ? error.message
                                  : "Failed to save answer";
                              toast.error(message);
                            }
                          }}
                        >
                          {option.text}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    rows={6}
                    placeholder="Write your answer here."
                    value={answerDrafts[question.id] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;

                      setAnswerDrafts((current) => ({
                        ...current,
                        [question.id]: value,
                      }));

                      void persistShortAnswer(
                        session.attempt!._id,
                        question.id,
                        value,
                        false
                      );
                    }}
                    onBlur={() =>
                      void persistShortAnswer(
                        session.attempt!._id,
                        question.id,
                        answerDrafts[question.id] ?? ""
                      )
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  setIsSubmitting(true);

                  await Promise.all(
                    session.quiz.questions
                      .filter((question) => question.type === "short_answer")
                      .map((question) =>
                        persistShortAnswer(
                          session.attempt!._id,
                          question.id,
                          answerDrafts[question.id] ?? ""
                        )
                      )
                  );

                  await submitAttempt({ attemptId: session.attempt!._id });
                  router.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to submit sample quiz";
                  toast.error(message);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Submit Sample Quiz
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Preparing your sample quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
