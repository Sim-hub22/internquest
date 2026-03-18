"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

function actionHref(quizId: string, applicationId: string, isResult: boolean) {
  return `${
    isResult
      ? `/candidate/quizzes/${quizId}/result`
      : `/candidate/quizzes/${quizId}`
  }?applicationId=${applicationId}` as Route;
}

export default function CandidateQuizzesPage() {
  const quizzes = useQuery(api.quizAttempts.listAssignedForCandidate, {});

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Assigned Quizzes</h1>
        <p className="text-muted-foreground">
          Take your assessments and watch for final graded results.
        </p>
      </div>

      {quizzes === undefined ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-48 w-full" key={index} />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No quizzes assigned yet</EmptyTitle>
            <EmptyDescription>
              When a recruiter assigns a quiz, it will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.map((item) => {
            const isResult =
              item.attempt?.status === "submitted" ||
              item.attempt?.status === "graded";

            return (
              <Card key={item.application._id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {item.quiz?.title ?? "Quiz unavailable"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {item.internship?.title ?? "Internship unavailable"}
                    </p>
                  </div>
                  <Badge variant={isResult ? "secondary" : "default"}>
                    {item.attempt?.status === "graded"
                      ? "Graded"
                      : item.attempt?.status === "submitted"
                        ? "Pending Review"
                        : "Ready"}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{item.quiz?.questionCount ?? 0} questions</span>
                    <span>{formatMinutesLabel(item.quiz?.timeLimit)}</span>
                    <span>
                      {formatScore(
                        item.attempt?.score,
                        item.quiz?.maxScore ?? 0
                      )}
                    </span>
                    {item.application.quizAssignedAt ? (
                      <span>
                        Assigned {formatDate(item.application.quizAssignedAt)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {item.quiz ? (
                      <Button asChild>
                        <Link
                          href={actionHref(
                            item.quiz._id,
                            item.application._id,
                            isResult
                          )}
                        >
                          {isResult ? "Open Result" : "Take Quiz"}
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled>Quiz unavailable</Button>
                    )}
                    <Button asChild variant="outline">
                      <Link
                        href={
                          `/candidate/applications/${item.application._id}` as Route
                        }
                      >
                        View Application
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
