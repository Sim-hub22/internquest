"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
  "accepted",
  "rejected",
] as const;

const PAGE_SIZE = 10;

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const APPLICATION_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export default function CandidateApplicationsPage() {
  const [status, setStatus] = useState<
    (typeof APPLICATION_STATUSES)[number] | "all"
  >("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const results = useQuery(api.applications.listForCandidateDetailed, {
    status: status === "all" ? undefined : status,
    paginationOpts: {
      numItems: PAGE_SIZE,
      cursor,
    },
  });

  const resetPagination = () => {
    setCursor(null);
    setCursorHistory([]);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Applications</h1>
          <p className="text-muted-foreground">
            Track progress across all internships you have applied to.
          </p>
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            resetPagination();
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPLICATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {toDisplayLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {results === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`app-skeleton-${index}`} className="h-28 w-full" />
          ))}
        </div>
      ) : results.page.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No applications yet</EmptyTitle>
            <EmptyDescription>
              Apply to internships and your pipeline updates will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="space-y-3">
            {results.page.map((entry) => (
              <Card key={entry.application._id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {entry.internship?.title ?? "Internship removed"}
                  </CardTitle>
                  <CardDescription>
                    {entry.internship?.company ?? "Unknown company"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Status: {toDisplayLabel(entry.application.status)}</p>
                    <p>
                      Applied on{" "}
                      {APPLICATION_DATE_FORMATTER.format(
                        new Date(entry.application.appliedAt)
                      )}
                    </p>
                  </div>

                  <Button asChild variant="outline">
                    <Link
                      href={
                        `/candidate/applications/${entry.application._id}` as Route
                      }
                    >
                      View details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCursorHistory((previous) => {
                      const next = [...previous];
                      const previousCursor = next.pop() ?? null;
                      setCursor(previousCursor);
                      return next;
                    });
                  }}
                  aria-disabled={cursorHistory.length === 0}
                  className={
                    cursorHistory.length === 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();

                    if (!results.continueCursor || results.isDone) {
                      return;
                    }

                    setCursorHistory((previous) => [...previous, cursor]);
                    setCursor(results.continueCursor);
                  }}
                  aria-disabled={results.isDone}
                  className={
                    results.isDone ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
}
