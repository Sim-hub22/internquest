"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import type { Preloaded } from "convex/react";
import { useConvexAuth, usePreloadedQuery, useQuery } from "convex/react";
import { BriefcaseBusinessIcon } from "lucide-react";

import {
  INTERNSHIP_STATUSES,
  InternshipStatusBadge,
} from "@/components/internships/constants";
import { InternshipCard } from "@/components/internships/internship-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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

const PAGE_SIZE = 9;

type RecruiterInternshipsPageProps = {
  preloadedResults: Preloaded<typeof api.internships.listForRecruiter>;
};

export function RecruiterInternshipsPage({
  preloadedResults,
}: RecruiterInternshipsPageProps) {
  const { isAuthenticated } = useConvexAuth();
  const [status, setStatus] = useState<string>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const isDefaultState = status === "all" && cursor === null;

  const ssrResults = usePreloadedQuery(preloadedResults);

  const dynamicResults = useQuery(
    api.internships.listForRecruiter,
    isAuthenticated && !isDefaultState
      ? {
          status:
            status === "all"
              ? undefined
              : (status as "draft" | "open" | "closed"),
          paginationOpts: {
            numItems: PAGE_SIZE,
            cursor,
          },
        }
      : "skip"
  );

  const results = isDefaultState ? ssrResults : dynamicResults;

  const goToNext = () => {
    if (!results?.continueCursor || results.isDone) {
      return;
    }

    setCursorHistory((previous) => [...previous, cursor]);
    setCursor(results.continueCursor);
  };

  const goToPrevious = () => {
    setCursorHistory((previous) => {
      const updated = [...previous];
      const previousCursor = updated.pop() ?? null;
      setCursor(previousCursor);
      return updated;
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Internships
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage drafts and open roles from one place.
          </p>
        </div>
        <Button asChild>
          <Link href={"/recruiter/internships/new" as Route}>
            Create Internship
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setCursor(null);
            setCursorHistory([]);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INTERNSHIP_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                <InternshipStatusBadge status={item} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {results === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton
              key={`recruiter-internship-skeleton-${index}`}
              className="h-72 w-full"
            />
          ))}
        </div>
      ) : results.page.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseBusinessIcon />
            </EmptyMedia>
            <EmptyTitle>No internships yet</EmptyTitle>
            <EmptyDescription>
              Start by creating your first internship listing.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link href={"/recruiter/internships/new" as Route}>
              Create Internship
            </Link>
          </Button>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.page.map((internship) => (
              <InternshipCard
                key={internship._id}
                internship={internship}
                href={`/recruiter/internships/${internship._id}`}
                actionLabel="Manage Listing"
              />
            ))}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goToPrevious();
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
                    goToNext();
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
