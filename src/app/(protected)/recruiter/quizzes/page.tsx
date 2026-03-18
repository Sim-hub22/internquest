"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

import { formatMinutesLabel } from "@/components/quizzes/utils";
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

export default function RecruiterQuizzesPage() {
  const quizzes = useQuery(api.quizzes.listForRecruiter, {});

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Recruitment Quizzes</h1>
          <p className="text-muted-foreground">
            Create screening quizzes and assign them to shortlisted candidates.
          </p>
        </div>

        <Button asChild>
          <Link href={"/recruiter/quizzes/new" as Route}>Create Quiz</Link>
        </Button>
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
            <EmptyTitle>No quizzes yet</EmptyTitle>
            <EmptyDescription>
              Start with a reusable screening quiz for your hiring pipeline.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.map((quiz) => (
            <Card key={quiz._id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {quiz.description ?? "No description provided."}
                  </p>
                </div>
                <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                  {quiz.isPublished ? "Published" : "Draft"}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{quiz.questionCount} questions</span>
                  <span>{quiz.maxScore} pts</span>
                  <span>{formatMinutesLabel(quiz.timeLimit)}</span>
                  {quiz.internship ? (
                    <span>{quiz.internship.title}</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link href={`/recruiter/quizzes/${quiz._id}/edit` as Route}>
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link
                      href={`/recruiter/quizzes/${quiz._id}/results` as Route}
                    >
                      Results
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
