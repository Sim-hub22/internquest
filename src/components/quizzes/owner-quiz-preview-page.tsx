"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

import { QuizReadOnlyPreview } from "@/components/quizzes/quiz-read-only-preview";
import { formatMinutesLabel } from "@/components/quizzes/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type OwnerQuizPreviewPageProps = {
  quizId: Id<"quizzes">;
  scope: "admin" | "recruiter";
};

export function OwnerQuizPreviewPage({
  quizId,
  scope,
}: OwnerQuizPreviewPageProps) {
  const preview = useQuery(api.quizzes.getOwnerPreview, { quizId });
  const backHref =
    scope === "recruiter" ? "/recruiter/quizzes" : "/admin/quizzes";

  if (preview === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={backHref as Route}>Back to quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={backHref as Route}>Back to quizzes</Link>
        </Button>
      </div>

      <QuizReadOnlyPreview
        maxScore={preview.maxScore}
        questionCount={preview.questionCount}
        quiz={preview.quiz}
        subtitle="Read-only preview of the candidate quiz experience"
        timeLimitLabel={formatMinutesLabel(preview.quiz.timeLimit)}
      />
    </div>
  );
}
