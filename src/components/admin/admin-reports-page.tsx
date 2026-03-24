"use client";

import { useState, useTransition } from "react";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { EyeIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  REPORT_ACTION_TYPES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  toReportLabel,
} from "@/lib/reports";

type ReportStatusFilter = "all" | (typeof REPORT_STATUSES)[number];
type ReportTargetFilter = "all" | (typeof REPORT_TARGET_TYPES)[number];
type ReviewStatus = "reviewed" | "resolved" | "dismissed";
type ReviewActionValue = "none" | (typeof REPORT_ACTION_TYPES)[number];

type AdminReportRow = Doc<"reports"> & {
  reporter: Pick<
    Doc<"users">,
    "_id" | "name" | "email" | "username" | "role"
  > | null;
  target: {
    type: string;
    title: string;
    subtitle: string;
    status: string;
  } | null;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const columnHelper = createColumnHelper<AdminReportRow>();

function getStatusBadgeVariant(status: Doc<"reports">["status"]) {
  if (status === "pending") {
    return "destructive";
  }

  if (status === "resolved") {
    return "default";
  }

  return "secondary";
}

function getActionOptions(targetType: string | undefined) {
  if (targetType === "internship") {
    return [{ value: "close_internship", label: "Close internship" }] as const;
  }

  if (targetType === "blog_post") {
    return [
      { value: "unpublish_blog_post", label: "Unpublish blog post" },
    ] as const;
  }

  if (targetType === "user") {
    return [{ value: "suspend_user", label: "Suspend user" }] as const;
  }

  return [] as const;
}

export function AdminReportsPage() {
  const { isAuthenticated } = useConvexAuth();
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("all");
  const [targetFilter, setTargetFilter] = useState<ReportTargetFilter>("all");
  const [selectedReportId, setSelectedReportId] =
    useState<Id<"reports"> | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("reviewed");
  const [reviewAction, setReviewAction] = useState<ReviewActionValue>("none");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSaving, startTransition] = useTransition();

  const reports = useQuery(
    api.reports.listForAdmin,
    isAuthenticated
      ? {
          status: statusFilter === "all" ? undefined : statusFilter,
          targetType: targetFilter === "all" ? undefined : targetFilter,
        }
      : "skip"
  );
  const selectedReport = useQuery(
    api.reports.getForAdmin,
    selectedReportId ? { reportId: selectedReportId } : "skip"
  );
  const reviewReport = useMutation(api.reports.review);

  const columns = [
    columnHelper.accessor("target", {
      id: "target",
      header: "Target",
      cell: ({ getValue }) => {
        const target = getValue();

        if (!target) {
          return (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          );
        }

        return (
          <div className="flex max-w-[20rem] min-w-0 flex-col xl:max-w-[24rem]">
            <span className="truncate font-medium">{target.title}</span>
            <span className="line-clamp-2 text-xs leading-5 whitespace-normal text-muted-foreground">
              {target.subtitle}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("targetType", {
      header: "Type",
      cell: ({ getValue }) => (
        <Badge variant="outline">{toReportLabel(getValue())}</Badge>
      ),
    }),
    columnHelper.accessor("reason", {
      header: "Reason",
      cell: ({ getValue }) => (
        <span className="block max-w-40 text-sm leading-5 whitespace-normal text-muted-foreground">
          {toReportLabel(getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("reporter", {
      id: "reporter",
      header: "Reporter",
      cell: ({ getValue }) => {
        const reporter = getValue();

        if (!reporter) {
          return (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          );
        }

        return (
          <div className="flex max-w-[12rem] min-w-0 flex-col xl:max-w-[14rem]">
            <span className="truncate font-medium">{reporter.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {reporter.email}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={getStatusBadgeVariant(getValue())}>
          {toReportLabel(getValue())}
        </Badge>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: ({ getValue }) => {
        const date = new Date(getValue());

        return (
          <div className="flex min-w-0 flex-col">
            <span>{DATE_FORMATTER.format(date)}</span>
            <span className="text-xs text-muted-foreground">
              {TIME_FORMATTER.format(date)}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          onClick={() => {
            setSelectedReportId(row.original._id);
            setReviewStatus(
              row.original.status === "pending" ? "reviewed" : "resolved"
            );
            setReviewAction("none");
            setReviewNotes(
              row.original.reviewNotes ?? row.original.details ?? ""
            );
          }}
        >
          <EyeIcon />
          Review
        </Button>
      ),
    }),
  ] as ColumnDef<AdminReportRow>[];

  const actionOptions = getActionOptions(selectedReport?.target?.type);

  const handleSubmit = () => {
    if (!selectedReportId) {
      return;
    }

    startTransition(async () => {
      try {
        await reviewReport({
          reportId: selectedReportId,
          status: reviewStatus,
          notes: reviewNotes.trim() || undefined,
          actionType:
            reviewStatus === "resolved" && reviewAction !== "none"
              ? reviewAction
              : undefined,
        });
        toast.success("Report updated");
        setSelectedReportId(null);
        setReviewNotes("");
        setReviewAction("none");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update report"
        );
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reports Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review reported content, inspect the target preview, and close the
            loop with moderation actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ReportStatusFilter)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REPORT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {toReportLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={targetFilter}
            onValueChange={(value) =>
              setTargetFilter(value as ReportTargetFilter)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All targets</SelectItem>
              {REPORT_TARGET_TYPES.map((target) => (
                <SelectItem key={target} value={target}>
                  {toReportLabel(target)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reports !== undefined && reports.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlertIcon />
            </EmptyMedia>
            <EmptyTitle>No reports found</EmptyTitle>
            <EmptyDescription>
              The moderation queue is clear for the current filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={reports ?? []}
          isLoading={reports === undefined}
          searchPlaceholder="Search target, reporter, or reason..."
          emptyMessage="No reports match the current filters."
        />
      )}

      <Dialog
        open={selectedReportId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReportId(null);
            setReviewNotes("");
            setReviewAction("none");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl" showCloseButton={!isSaving}>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Inspect the reported content and choose how this moderation item
              should be resolved.
            </DialogDescription>
          </DialogHeader>

          {selectedReport === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedReport === null ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Report unavailable</EmptyTitle>
                <EmptyDescription>
                  This report may have been removed or no longer exists.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Reporter
                  </p>
                  <p className="mt-1 font-medium">
                    {selectedReport.reporter?.name ?? "Unknown reporter"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.reporter?.email ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Report metadata
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {toReportLabel(selectedReport.targetType)}
                    </Badge>
                    <Badge variant="outline">
                      {toReportLabel(selectedReport.reason)}
                    </Badge>
                    <Badge
                      variant={getStatusBadgeVariant(selectedReport.status)}
                    >
                      {toReportLabel(selectedReport.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Created{" "}
                    {DATE_TIME_FORMATTER.format(
                      new Date(selectedReport.createdAt)
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Target preview
                </p>
                {selectedReport.target?.type === "internship" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-base font-medium">
                      {selectedReport.target.internship.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.target.internship.company} ·{" "}
                      {selectedReport.target.recruiter?.name ??
                        "Unknown recruiter"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {selectedReport.target.internship.status}
                    </p>
                    {selectedReport.target.internship.adminModerationReason ? (
                      <p className="text-sm text-muted-foreground">
                        Existing moderation:{" "}
                        {selectedReport.target.internship.adminModerationReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {selectedReport.target?.type === "blog_post" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-base font-medium">
                      {selectedReport.target.post.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.target.author?.name ?? "Unknown author"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.target.post.excerpt}
                    </p>
                  </div>
                ) : null}
                {selectedReport.target?.type === "user" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-base font-medium">
                      {selectedReport.target.user.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.target.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Role: {selectedReport.target.user.role ?? "unassigned"}
                    </p>
                  </div>
                ) : null}
              </div>

              {selectedReport.details ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Reporter details
                  </p>
                  <p className="mt-2 text-sm">{selectedReport.details}</p>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Decision</p>
                  <Select
                    value={reviewStatus}
                    onValueChange={(value) =>
                      setReviewStatus(value as ReviewStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Moderation action</p>
                  <Select
                    value={reviewAction}
                    onValueChange={(value) =>
                      setReviewAction(value as ReviewActionValue)
                    }
                    disabled={reviewStatus !== "resolved"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No action</SelectItem>
                      {actionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Review notes</p>
                <Textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Document what you found or why you took this action."
                  rows={5}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedReportId(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSaving ||
                selectedReport === undefined ||
                selectedReport === null ||
                (reviewStatus === "resolved" &&
                  reviewAction !== "none" &&
                  actionOptions.length === 0)
              }
            >
              Save review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
