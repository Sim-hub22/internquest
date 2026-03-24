"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowUpDownIcon,
  BriefcaseBusinessIcon,
  MoreHorizontalIcon,
  ShieldAlertIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { InternshipStatusBadge } from "@/components/internships/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type AdminInternshipRow = Doc<"internships"> & {
  recruiter: {
    _id: Id<"users">;
    name: string;
    email: string;
    username: string;
  } | null;
};

type StatusFilter = "all" | "draft" | "open" | "closed";
type ModerationFilter = "all" | "active" | "moderated";

type CloseTarget = {
  internshipId: Id<"internships">;
  title: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const columnHelper = createColumnHelper<AdminInternshipRow>();

export function AdminInternshipsPage() {
  const { isAuthenticated } = useConvexAuth();
  const internships = useQuery(
    api.admin.listInternships,
    isAuthenticated ? {} : "skip"
  );
  const closeInternship = useMutation(api.admin.closeInternship);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [moderationFilter, setModerationFilter] =
    useState<ModerationFilter>("all");
  const [pendingTarget, setPendingTarget] = useState<CloseTarget | null>(null);
  const [isMutating, startTransition] = useTransition();

  const filteredInternships = useMemo(() => {
    if (!internships) {
      return [];
    }

    return internships.filter((internship) => {
      const matchesStatus =
        statusFilter === "all" ? true : internship.status === statusFilter;
      const matchesModeration =
        moderationFilter === "all"
          ? true
          : moderationFilter === "moderated"
            ? internship.isClosedByAdmin === true
            : internship.isClosedByAdmin !== true;

      return matchesStatus && matchesModeration;
    });
  }, [internships, moderationFilter, statusFilter]);

  const columns = [
    columnHelper.accessor("title", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Listing
          <ArrowUpDownIcon data-icon="inline-end" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.original.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.company}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("recruiter", {
      id: "recruiter",
      header: "Recruiter",
      cell: ({ getValue }) => {
        const recruiter = getValue();

        if (!recruiter) {
          return (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          );
        }

        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{recruiter.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              @{recruiter.username}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <InternshipStatusBadge status={row.original.status} />
          {row.original.isClosedByAdmin ? (
            <Badge variant="destructive">Moderated</Badge>
          ) : null}
        </div>
      ),
    }),
    columnHelper.accessor("applicationDeadline", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Deadline
          <ArrowUpDownIcon data-icon="inline-end" />
        </Button>
      ),
      cell: ({ getValue }) => DATE_FORMATTER.format(new Date(getValue())),
    }),
    columnHelper.accessor("adminModerationReason", {
      header: "Moderation",
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="block max-w-[18rem] text-sm leading-5 whitespace-normal text-muted-foreground xl:max-w-[22rem]">
            {getValue()}
          </span>
        ) : (
          <span className="block max-w-[18rem] text-sm whitespace-normal text-muted-foreground xl:max-w-[22rem]">
            Not moderated
          </span>
        ),
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontalIcon />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="whitespace-nowrap">
                <Link href={`/internships/${row.original._id}` as Route}>
                  <SquareArrowOutUpRightIcon />
                  Open public page
                </Link>
              </DropdownMenuItem>
              {row.original.isClosedByAdmin !== true ? (
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  variant="destructive"
                  onClick={() =>
                    setPendingTarget({
                      internshipId: row.original._id,
                      title: row.original.title,
                    })
                  }
                >
                  <ShieldAlertIcon />
                  Close listing
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ] as ColumnDef<AdminInternshipRow>[];

  const handleConfirm = () => {
    if (!pendingTarget) {
      return;
    }

    startTransition(async () => {
      try {
        await closeInternship({ internshipId: pendingTarget.internshipId });
        toast.success("Internship closed by admin");
        setPendingTarget(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to close internship"
        );
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Internship Moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Review all listings, inspect recruiter ownership, and close roles
            that should not remain public.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={moderationFilter}
            onValueChange={(value) =>
              setModerationFilter(value as ModerationFilter)
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All listings</SelectItem>
              <SelectItem value="active">Not moderated</SelectItem>
              <SelectItem value="moderated">Moderated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {internships !== undefined && internships.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseBusinessIcon />
            </EmptyMedia>
            <EmptyTitle>No internships yet</EmptyTitle>
            <EmptyDescription>
              Listings will appear here once recruiters start publishing
              opportunities.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={filteredInternships}
          isLoading={internships === undefined}
          searchPlaceholder="Search listing, company, or recruiter..."
          emptyMessage="No internships match the current filters."
        />
      )}

      <AlertDialog
        open={pendingTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingTarget(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <ShieldAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Close this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTarget
                ? `${pendingTarget.title} will be marked closed, hidden from public browsing, and locked against recruiter edits or reopening.`
                : "Close this listing."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating || pendingTarget === null}
              onClick={handleConfirm}
              variant="destructive"
            >
              Close listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
