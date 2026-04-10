"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  type ColumnDef,
  type SortingFn,
  createColumnHelper,
} from "@tanstack/react-table";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowUpDownIcon,
  BriefcaseBusinessIcon,
  LayoutDashboardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import {
  INTERNSHIP_STATUSES,
  InternshipStatusBadge,
  formatInternshipStipend,
  toDisplayLabel,
} from "@/components/internships/constants";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const sortByDeadline: SortingFn<Doc<"internships">> = (rowA, rowB) =>
  rowA.original.applicationDeadline - rowB.original.applicationDeadline;

const sortByStipend: SortingFn<Doc<"internships">> = (rowA, rowB) =>
  (rowA.original.stipend ?? 0) - (rowB.original.stipend ?? 0);

function InternshipStatusSelectCell({
  internshipId,
  status,
}: {
  internshipId: Id<"internships">;
  status: "draft" | "open" | "closed";
}) {
  const updateStatus = useMutation(api.internships.updateStatus);
  const [nextStatus, setNextStatus] = useState(status);
  const [isSaving, setIsSaving] = useState(false);

  const onStatusChange = async (value: "draft" | "open" | "closed") => {
    setNextStatus(value);
    setIsSaving(true);

    try {
      await updateStatus({ internshipId, status: value });
      toast.success(`Listing moved to ${toDisplayLabel(value)}`);
    } catch (error) {
      setNextStatus(status);
      console.error(error);
      toast.error("Failed to update listing status");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Select value={nextStatus} onValueChange={onStatusChange}>
      <SelectTrigger className="w-36" disabled={isSaving}>
        <SelectValue>
          <InternshipStatusBadge status={nextStatus} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {INTERNSHIP_STATUSES.map((value) => (
            <SelectItem key={`${internshipId}-${value}`} value={value}>
              <InternshipStatusBadge status={value} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

const columnHelper = createColumnHelper<Doc<"internships">>();

const columns = [
  columnHelper.accessor("title", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  columnHelper.accessor("company", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Company
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
  }),
  columnHelper.accessor("status", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
    cell: ({ row }) => (
      <InternshipStatusSelectCell
        internshipId={row.original._id}
        status={row.original.status}
      />
    ),
  }),
  columnHelper.accessor("locationType", {
    id: "location",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Location
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
    cell: ({ getValue }) => toDisplayLabel(getValue()),
  }),
  columnHelper.accessor("applicationDeadline", {
    id: "deadline",
    sortingFn: sortByDeadline,
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
  columnHelper.accessor("stipend", {
    id: "stipend",
    sortingFn: sortByStipend,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Stipend
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
    cell: ({ getValue }) => formatInternshipStipend(getValue(), "-"),
  }),
  columnHelper.accessor("viewCount", {
    id: "views",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Views
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
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
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-fit" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link
                href={`/recruiter/internships/${row.original._id}` as Route}
              >
                <LayoutDashboardIcon />
                Manage listing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={
                  `/recruiter/internships/${row.original._id}/edit` as Route
                }
              >
                <PencilIcon />
                Edit listing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={
                  `/recruiter/internships/${row.original._id}/applications` as Route
                }
              >
                <UsersIcon />
                View applications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
] as ColumnDef<Doc<"internships">>[];

export function RecruiterInternshipsPage() {
  const { isAuthenticated } = useConvexAuth();
  const [status, setStatus] = useState<string>("all");

  const results = useQuery(
    api.internships.listAllForRecruiter,
    isAuthenticated
      ? {
          status:
            status === "all"
              ? undefined
              : (status as "draft" | "open" | "closed"),
        }
      : "skip"
  );

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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={"/recruiter/dashboard" as Route}>View Dashboard</Link>
          </Button>
          <Button asChild>
            <Link href={"/recruiter/internships/new" as Route}>
              Create Internship
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value)}>
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {INTERNSHIP_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  <InternshipStatusBadge status={item} />
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {results?.length === 0 && status === "all" ? (
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
        <DataTable
          columns={columns}
          data={results ?? []}
          isLoading={results === undefined}
          searchPlaceholder="Search title or company…"
          emptyMessage="No internships found."
        />
      )}
    </div>
  );
}
