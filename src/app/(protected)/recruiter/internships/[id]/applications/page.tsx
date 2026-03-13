"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { usePaginatedQuery, useQuery } from "convex/react";
import { FileText, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const ALL_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "quiz_assigned",
  "quiz_completed",
  "accepted",
  "rejected",
] as const;

type ApplicationStatus = (typeof ALL_STATUSES)[number];

function labelForStatus(status: ApplicationStatus) {
  return status.replaceAll("_", " ");
}

function badgeClassForStatus(status: ApplicationStatus) {
  if (status === "accepted")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "quiz_assigned" || status === "quiz_completed")
    return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function RecruiterInternshipApplicationsPage() {
  const params = useParams<{ id: string }>();
  const internshipId = params.id as Id<"internships">;
  const currentUser = useQuery(api.users.current, {});

  if (currentUser === undefined) {
    return <div className="p-6">Loading applications...</div>;
  }

  if (currentUser === null) {
    return <div className="p-6">Please sign in to view applications.</div>;
  }

  if (currentUser.role !== "recruiter") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return <RecruiterApplicationsList internshipId={internshipId} />;
}

function RecruiterApplicationsList({
  internshipId,
}: {
  internshipId: Id<"internships">;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>(
    "all"
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.applications.listForInternshipDetailed,
    {
      internshipId,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { initialNumItems: 10 }
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Applications</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Internship applications
          </h1>
        </div>

        <div className="w-full sm:w-56">
          <Select
            onValueChange={(value) =>
              setStatusFilter(value as "all" | ApplicationStatus)
            }
            value={statusFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((statusValue) => (
                <SelectItem key={statusValue} value={statusValue}>
                  {labelForStatus(statusValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No applications yet</EmptyTitle>
            <EmptyDescription>
              Applications will appear here once candidates apply.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {results.map((row) => (
            <Card key={row.application._id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">
                    {row.candidate?.name ?? "Unknown candidate"}
                  </CardTitle>
                  <Badge
                    className={badgeClassForStatus(row.application.status)}
                    variant="outline"
                  >
                    {labelForStatus(row.application.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <UserRound className="size-4" />
                    {row.candidate?.email ?? "No email available"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FileText className="size-4" />
                    Applied{" "}
                    {new Date(row.application.appliedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button asChild>
                    <Link
                      href={`/recruiter/internships/${internshipId}/applications/${row.application._id}`}
                    >
                      Review application
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {status === "CanLoadMore" ? (
            <div className="flex justify-center">
              <Button onClick={() => loadMore(10)} variant="outline">
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
