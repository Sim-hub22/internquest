"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";
import {
  ArrowRightIcon,
  BookmarkIcon,
  CalendarClockIcon,
  MapPinIcon,
} from "lucide-react";

import {
  formatInternshipStipend,
  toDisplayLabel,
} from "@/components/internships/constants";
import { InternshipBookmarkButton } from "@/components/internships/internship-bookmark-button";
import { Badge } from "@/components/ui/badge";
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const BOOKMARKS_PAGE_LIMIT = 100;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatStipend(stipend?: number) {
  return formatInternshipStipend(stipend, "Stipend not listed");
}

export default function CandidateBookmarksPage() {
  const bookmarks = useQuery(api.internshipBookmarks.listForCurrentCandidate, {
    limit: BOOKMARKS_PAGE_LIMIT,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bookmarks</h1>
          <p className="text-muted-foreground">
            Revisit internships you saved while browsing.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={"/internships" as Route}>Browse Internships</Link>
        </Button>
      </div>

      {bookmarks === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`bookmark-skeleton-${index}`} className="h-52" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <Empty className="min-h-96 border border-dashed bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookmarkIcon />
            </EmptyMedia>
            <EmptyTitle>No bookmarked internships yet</EmptyTitle>
            <EmptyDescription>
              Save internships from the browse page or internship detail page
              and they will appear here.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link href={"/internships" as Route}>Browse internships</Link>
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.bookmarkId} className="flex h-full flex-col">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <CardTitle className="line-clamp-2 text-lg">
                      {bookmark.internship?.title ?? "Internship removed"}
                    </CardTitle>
                    <CardDescription>
                      {bookmark.internship?.company ?? "Unknown company"}
                    </CardDescription>
                  </div>
                  <InternshipBookmarkButton
                    internshipId={bookmark.internshipId}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={bookmark.isAvailable ? "outline" : "secondary"}
                  >
                    {bookmark.isAvailable ? "Open" : bookmark.unavailableReason}
                  </Badge>
                  {bookmark.internship ? (
                    <Badge>
                      {toDisplayLabel(bookmark.internship.category)}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {bookmark.internship ? (
                    <>
                      <p className="inline-flex items-center gap-2">
                        <MapPinIcon className="size-4" />
                        {toDisplayLabel(bookmark.internship.locationType)}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <CalendarClockIcon className="size-4" />
                        Apply by{" "}
                        {DATE_FORMATTER.format(
                          new Date(bookmark.internship.applicationDeadline)
                        )}
                      </p>
                      <p>{formatStipend(bookmark.internship.stipend)}</p>
                    </>
                  ) : (
                    <p>This internship is no longer available.</p>
                  )}
                  <p>
                    Saved {DATE_FORMATTER.format(new Date(bookmark.savedAt))}
                  </p>
                </div>

                <div className="mt-auto">
                  {bookmark.isAvailable && bookmark.internship ? (
                    <Button asChild className="w-full">
                      <Link
                        href={`/internships/${bookmark.internshipId}` as Route}
                      >
                        Open Internship
                        <ArrowRightIcon />
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled variant="outline">
                      Unavailable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
