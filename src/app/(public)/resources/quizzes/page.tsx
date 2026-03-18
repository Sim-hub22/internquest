"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

import { formatMinutesLabel, formatScore } from "@/components/quizzes/utils";
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

export default function PublicSampleQuizzesPage() {
  const quizzes = useQuery(api.quizzes.listPublishedSamples, {});

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 lg:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Sample Quizzes
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Practice with public quizzes and get a feel for the assessment flow
          used across InternQuest.
        </p>
      </div>

      {quizzes === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-48 w-full" key={index} />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sample quizzes yet</EmptyTitle>
            <EmptyDescription>
              Public practice quizzes will appear here once they are published.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz._id}>
              <CardHeader>
                <CardTitle>{quiz.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {quiz.description ?? "Public practice quiz"}
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{quiz.questionCount} questions</span>
                  <span>{formatMinutesLabel(quiz.timeLimit)}</span>
                  <span>{formatScore(undefined, quiz.maxScore)}</span>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/resources/quizzes/${quiz._id}` as Route}>
                    Open Quiz
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
