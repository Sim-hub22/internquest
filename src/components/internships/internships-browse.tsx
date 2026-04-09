"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { BriefcaseBusinessIcon, SearchIcon } from "lucide-react";

import {
  INTERNSHIP_CATEGORIES,
  LOCATION_TYPES,
  toDisplayLabel,
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
import { Input } from "@/components/ui/input";
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

type InternshipsBrowseProps = {
  showCreateCta?: boolean;
  preloadedListResults: Preloaded<typeof api.internships.listPublic>;
  initialSearch?: string;
  initialCategory?: "all" | InternshipCategory;
};

type InternshipCategory = (typeof INTERNSHIP_CATEGORIES)[number];
type InternshipLocationType = (typeof LOCATION_TYPES)[number];

const PAGE_SIZE = 9;

export function InternshipsBrowse({
  showCreateCta = false,
  preloadedListResults,
  initialSearch = "",
  initialCategory = "all",
}: InternshipsBrowseProps) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<"all" | InternshipCategory>(
    initialCategory
  );
  const [locationType, setLocationType] = useState<
    "all" | InternshipLocationType
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "deadline" | "stipend">(
    "newest"
  );
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const trimmedSearch = search.trim();
  const sharedPagination = {
    numItems: PAGE_SIZE,
    cursor,
  };

  // SSR-preloaded result for the default view (no search, default filters, first page)
  const isDefaultState =
    !trimmedSearch &&
    category === "all" &&
    locationType === "all" &&
    sortBy === "newest" &&
    cursor === null;

  const ssrListResults = usePreloadedQuery(preloadedListResults);

  const dynamicListResults = useQuery(
    api.internships.listPublic,
    !isDefaultState && !trimmedSearch
      ? {
          category: category === "all" ? undefined : category,
          locationType: locationType === "all" ? undefined : locationType,
          sortBy,
          paginationOpts: sharedPagination,
        }
      : "skip"
  );

  const searchResults = useQuery(
    api.internships.searchPublic,
    trimmedSearch
      ? {
          query: trimmedSearch,
          category: category === "all" ? undefined : category,
          locationType: locationType === "all" ? undefined : locationType,
          paginationOpts: sharedPagination,
        }
      : "skip"
  );

  const results = trimmedSearch
    ? searchResults
    : isDefaultState
      ? ssrListResults
      : dynamicListResults;

  const resetPagination = () => {
    setCursor(null);
    setCursorHistory([]);
  };

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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Internships</h1>
          <p className="text-sm text-muted-foreground">
            Discover opportunities and filter by category, format, and timeline.
          </p>
        </div>
        {showCreateCta ? (
          <Button asChild>
            <Link href={"/recruiter/internships/new" as Route}>
              Create Internship
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search internships by title..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPagination();
            }}
          />
        </div>

        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value as "all" | InternshipCategory);
            resetPagination();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INTERNSHIP_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {toDisplayLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationType}
          onValueChange={(value) => {
            setLocationType(value as "all" | InternshipLocationType);
            resetPagination();
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Location type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {LOCATION_TYPES.map((item) => (
              <SelectItem key={item} value={item}>
                {toDisplayLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end">
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value as typeof sortBy);
            resetPagination();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="deadline">Deadline approaching</SelectItem>
            <SelectItem value="stipend">Highest stipend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {results === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton
              key={`internship-skeleton-${index}`}
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
            <EmptyTitle>No internships found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or search terms to discover more roles.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.page.map((internship) => (
              <InternshipCard
                key={internship._id}
                internship={internship}
                href={`/internships/${internship._id}`}
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
