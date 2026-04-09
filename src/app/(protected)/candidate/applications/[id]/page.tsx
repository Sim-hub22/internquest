"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "convex/react";

import { shouldShowCandidateApplicationQuizCard } from "@/components/candidate/candidate-application-quiz-visibility";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export default function CandidateApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params.id as Id<"applications">;

  const detail = useQuery(api.applications.getCandidateDetail, {
    applicationId,
  });

  if (detail === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Application not found</CardTitle>
            <CardDescription>
              The application may have been removed or is unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/candidate/applications" as Route}>
                Back to applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showQuizCta = shouldShowCandidateApplicationQuizCard({
    status: detail.application.status,
    hasAssignedQuiz: detail.assignedQuiz !== null,
    hasQuizAttempt: detail.quizAttempt !== null,
    quizAssignedAt: detail.quizAssignedAt,
  });
  const quizHref = detail.assignedQuiz
    ? (`/candidate/quizzes/${detail.assignedQuiz._id}?applicationId=${applicationId}` as Route)
    : ("/candidate/quizzes" as Route);
  const quizResultHref = detail.assignedQuiz
    ? (`/candidate/quizzes/${detail.assignedQuiz._id}/result?applicationId=${applicationId}` as Route)
    : ("/candidate/quizzes" as Route);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Application Detail</h1>
          <p className="text-muted-foreground">
            {detail.internship?.title ?? "Internship unavailable"}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={"/candidate/applications" as Route}>
            Back to applications
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current status</CardTitle>
          <CardDescription>
            {toDisplayLabel(detail.application.status)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Applied on:{" "}
            {DATE_FORMATTER.format(new Date(detail.application.appliedAt))}
          </p>
          <p>
            Last updated:{" "}
            {DATE_FORMATTER.format(new Date(detail.application.updatedAt))}
          </p>
          {detail.resumeUrl ? (
            <Button asChild size="sm" variant="secondary">
              <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                View uploaded resume
              </a>
            </Button>
          ) : null}
          {detail.coverLetterUrl ? (
            <Button asChild size="sm" variant="secondary">
              <a href={detail.coverLetterUrl} target="_blank" rel="noreferrer">
                Open uploaded cover letter
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.application.statusHistory.map((entry, index) => (
            <div
              key={`${entry.status}-${entry.changedAt}-${index}`}
              className="rounded-md border p-3 text-sm"
            >
              <p className="font-medium">{toDisplayLabel(entry.status)}</p>
              <p className="text-muted-foreground">
                {DATE_FORMATTER.format(new Date(entry.changedAt))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {showQuizCta ? (
        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <CardDescription>
              Your application has a quiz step in the hiring pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {detail.quizNeedsManualReview
                ? "Your quiz was submitted successfully and is waiting for final grading."
                : detail.quizResultReady
                  ? "Your final quiz result is ready to review."
                  : "Your assigned quiz is ready to start or continue."}
            </p>
            <Button asChild variant="outline">
              <Link
                href={
                  detail.quizResultReady || detail.quizNeedsManualReview
                    ? quizResultHref
                    : quizHref
                }
              >
                {detail.quizResultReady || detail.quizNeedsManualReview
                  ? "Open quiz result"
                  : "Open assigned quiz"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {detail.coverLetterUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href={detail.coverLetterUrl} target="_blank" rel="noreferrer">
                Open cover letter PDF
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : detail.application.coverLetter ? (
        <Card>
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted/40 p-4 text-sm whitespace-pre-wrap">
              {detail.application.coverLetter}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {detail.internship ? (
        <Card>
          <CardHeader>
            <CardTitle>Internship snapshot</CardTitle>
            <CardDescription>
              {detail.internship.company} ·{" "}
              {toDisplayLabel(detail.internship.locationType)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deadline:{" "}
              {DATE_FORMATTER.format(
                new Date(detail.internship.applicationDeadline)
              )}
            </p>
            <Button asChild variant="outline">
              <Link href={`/internships/${detail.internship._id}` as Route}>
                Open internship page
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
