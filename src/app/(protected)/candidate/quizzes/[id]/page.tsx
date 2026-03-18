"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  formatMinutesLabel,
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

function buildResultHref(quizId: string, applicationId: string | null) {
  const path = `/candidate/quizzes/${quizId}/result`;
  return applicationId ? `${path}?applicationId=${applicationId}` : path;
}

export default function CandidateQuizTakingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.id as Id<"quizzes">;
  const applicationId = searchParams.get(
    "applicationId"
  ) as Id<"applications"> | null;
  const session = useQuery(api.quizAttempts.getCandidateAttempt, {
    quizId,
    applicationId: applicationId ?? undefined,
  });
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
    if (!session || session.attempt || hasRequestedStart) {
      return;
    }

    setHasRequestedStart(true);
    startAttempt({
      quizId,
      applicationId: applicationId ?? undefined,
    }).catch((error) => {
      const message =
        error instanceof Error ? error.message : "Failed to start quiz";
      toast.error(message);
      setHasRequestedStart(false);
    });
  }, [applicationId, hasRequestedStart, quizId, session, startAttempt]);

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
      .then(() => {
        router.push(buildResultHref(quizId, applicationId) as Route);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Failed to submit quiz";
        toast.error(message);
      })
      .finally(() => setIsSubmitting(false));
  }, [
    applicationId,
    isSubmitting,
    quizId,
    router,
    session,
    submitAttempt,
    tick,
  ]);

  if (session === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz unavailable</CardTitle>
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

  if (!session.attempt) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Preparing your quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.attempt.status !== "in_progress") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz already submitted</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={buildResultHref(quizId, applicationId) as Route}>
                Open result
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/candidate/quizzes" as Route}>Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = formatTimeRemaining(session.attempt.deadlineAt);

  const handleChoiceSave = async (questionId: string, optionId: string) => {
    setAnswerDrafts((current) => ({ ...current, [questionId]: optionId }));

    try {
      await saveAnswer({
        attemptId: session.attempt!._id,
        questionId,
        selectedOptionId: optionId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save answer";
      toast.error(message);
    }
  };

  const persistShortAnswer = async (
    questionId: string,
    value: string,
    showError = true
  ) => {
    try {
      await saveAnswer({
        attemptId: session.attempt!._id,
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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      await Promise.all(
        session.quiz.questions
          .filter((question) => question.type === "short_answer")
          .map((question) =>
            persistShortAnswer(question.id, answerDrafts[question.id] ?? "")
          )
      );

      await submitAttempt({ attemptId: session.attempt!._id });
      router.push(buildResultHref(quizId, applicationId) as Route);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit quiz";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{session.quiz.title}</h1>
          <p className="text-muted-foreground">
            {session.internship?.title ?? "Assigned application quiz"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {session.quiz.questions.length} questions
          </Badge>
          <Badge variant="outline">
            {formatMinutesLabel(session.quiz.timeLimit)}
          </Badge>
          {remaining ? <Badge>{remaining}</Badge> : null}
        </div>
      </div>

      {session.quiz.description ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {session.quiz.description}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {session.quiz.questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Question {index + 1} · {question.points} pts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm">{question.question}</p>

              {question.type === "multiple_choice" ? (
                <div className="grid gap-3">
                  {question.options?.map((option) => {
                    const isSelected = answerDrafts[question.id] === option.id;

                    return (
                      <Button
                        key={option.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "justify-start",
                          isSelected && "shadow-sm"
                        )}
                        onClick={() => handleChoiceSave(question.id, option.id)}
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

                    void persistShortAnswer(question.id, value, false);
                  }}
                  onBlur={() =>
                    void persistShortAnswer(
                      question.id,
                      answerDrafts[question.id] ?? ""
                    )
                  }
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild variant="outline">
          <Link href={"/candidate/quizzes" as Route}>Back to quizzes</Link>
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit}>
          Submit Quiz
        </Button>
      </div>
    </div>
  );
}
