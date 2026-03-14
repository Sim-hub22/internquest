"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  type ColumnDef,
  type SortingFn,
  createColumnHelper,
} from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { ArrowUpDownIcon, EyeIcon, MoreHorizontalIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { toDisplayLabel } from "@/components/internships/constants";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function statusVariant(status: string) {
  switch (status) {
    case "accepted":
      return "default";
    case "rejected":
      return "destructive";
    case "shortlisted":
    case "quiz_assigned":
    case "quiz_completed":
      return "secondary";
    default:
      return "outline";
  }
}

type ApplicationRow = {
  application: { _id: string; status: string; appliedAt: number };
  internship: { title: string; company: string } | null;
};

const sortByTimestamp: SortingFn<ApplicationRow> = (rowA, rowB) =>
  rowA.original.application.appliedAt - rowB.original.application.appliedAt;

const columnHelper = createColumnHelper<ApplicationRow>();

const columns = [
  columnHelper.accessor(
    (row) => row.internship?.title ?? "Internship removed",
    {
      id: "internship",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Internship
          <ArrowUpDownIcon data-icon="inline-end" />
        </Button>
      ),
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }
  ),
  columnHelper.accessor((row) => row.internship?.company ?? "Unknown company", {
    id: "company",
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
  columnHelper.accessor((row) => row.application.status, {
    id: "status",
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
    cell: ({ getValue }) => {
      const value = getValue();
      return (
        <Badge variant={statusVariant(value)}>{toDisplayLabel(value)}</Badge>
      );
    },
  }),
  columnHelper.accessor((row) => row.application.appliedAt, {
    id: "applied",
    sortingFn: sortByTimestamp,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Applied
        <ArrowUpDownIcon data-icon="inline-end" />
      </Button>
    ),
    cell: ({ getValue }) => DATE_FORMATTER.format(new Date(getValue())),
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
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link
                href={
                  `/candidate/applications/${row.original.application._id}` as Route
                }
              >
                <EyeIcon />
                View details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
] as ColumnDef<ApplicationRow>[];

export default function CandidateApplicationsPage() {
  const [status, setStatus] = useState<
    (typeof APPLICATION_STATUSES)[number] | "all"
  >("all");

  const results = useQuery(api.applications.listAllForCandidateDetailed, {
    status: status === "all" ? undefined : status,
  });

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
          onValueChange={(value) => setStatus(value as typeof status)}
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {APPLICATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {toDisplayLabel(value)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={(results ?? []) as ApplicationRow[]}
        isLoading={results === undefined}
        searchPlaceholder="Search internship or company…"
        emptyMessage="No applications found."
      />
    </div>
  );
}
