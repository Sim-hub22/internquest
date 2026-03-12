"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect } from "react";

import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery, useQuery } from "convex/react";
import { CalendarClockIcon, CircleAlertIcon, EyeIcon } from "lucide-react";

import {
  InternshipMeta,
  toDisplayLabel,
} from "@/components/internships/constants";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

type InternshipDetailPageProps = {
  preloadedInternship: Preloaded<typeof api.internships.getPublic>;
};

export function InternshipDetailPage({
  preloadedInternship,
}: InternshipDetailPageProps) {
  const internship = usePreloadedQuery(preloadedInternship);
  const currentUser = useQuery(api.users.current);
  const trackView = useMutation(api.internships.trackView);

  useEffect(() => {
    if (!internship) {
      return;
    }

    void trackView({ internshipId: internship._id });
  }, [internship, trackView]);

  if (!internship) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleAlertIcon className="size-5 text-muted-foreground" />
              Internship unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This internship is no longer open for public viewing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{toDisplayLabel(internship.category)}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <EyeIcon className="size-3.5" />
            {internship.viewCount} views
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {internship.title}
        </h1>
        <InternshipMeta
          company={internship.company}
          locationType={internship.locationType}
          duration={internship.duration}
        />
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Apply by {new Date(internship.applicationDeadline).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RichTextContent html={internship.description} />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Requirements</h2>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {internship.requirements.map((requirement, index) => (
                <li key={`${internship._id}-requirement-${index}`}>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {currentUser === undefined ? (
          <Skeleton className="h-9 w-36" />
        ) : currentUser === null ? (
          <Button asChild>
            <Link href={"/sign-up" as Route}>Sign up to apply</Link>
          </Button>
        ) : currentUser.role === "candidate" ? (
          <>
            <Button disabled>Apply Flow Opens In Phase 3</Button>
            <Button asChild variant="outline">
              <Link href={"/candidate/internships" as Route}>
                View Candidate Dashboard
              </Link>
            </Button>
          </>
        ) : currentUser.role === "recruiter" ? (
          <Button asChild variant="outline">
            <Link href={`/recruiter/internships/${internship._id}` as Route}>
              Manage Listing
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={"/admin/dashboard" as Route}>
              Go To Admin Dashboard
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
