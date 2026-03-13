"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useQuery } from "convex/react";

import { RichTextContent } from "@/components/rich-text-content";
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

      {detail.application.coverLetter ? (
        <Card>
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextContent html={detail.application.coverLetter} />
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
