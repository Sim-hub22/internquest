"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpDownIcon,
  EyeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { formatMinutesLabel } from "@/components/quizzes/utils";
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
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type QuizDeleteTarget = {
  ids: Id<"quizzes">[];
  label: string;
  count: number;
};

type AdminQuizRow = {
  _id: Id<"quizzes">;
  title: string;
  description?: string;
  isPublished: boolean;
  questionCount: number;
  maxScore: number;
  timeLimit?: number;
  updatedAt: number;
  canDelete: boolean;
  deleteDisabledReason: string | null;
};

function quizStatusVariant(isPublished: boolean) {
  return isPublished ? "default" : "secondary";
}

const columnHelper = createColumnHelper<AdminQuizRow>();
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export default function AdminQuizzesPage() {
  const quizzes = useQuery(api.quizzes.listForAdmin, {});
  const removeQuiz = useMutation(api.quizzes.remove);
  const [quizPendingDelete, setQuizPendingDelete] =
    useState<QuizDeleteTarget | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
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
    columnHelper.accessor("isPublished", {
      id: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={quizStatusVariant(getValue())}>
          {getValue() ? "Published" : "Draft"}
        </Badge>
      ),
    }),
    columnHelper.accessor("questionCount", {
      id: "questions",
      header: "Questions",
    }),
    columnHelper.accessor("maxScore", {
      id: "max_score",
      header: "Max score",
      cell: ({ getValue }) => `${getValue()} pts`,
    }),
    columnHelper.accessor("timeLimit", {
      id: "time_limit",
      header: "Time limit",
      cell: ({ getValue }) => formatMinutesLabel(getValue()),
    }),
    columnHelper.accessor("updatedAt", {
      id: "updated",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
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
                <Link href={`/admin/quizzes/${row.original._id}` as Route}>
                  <EyeIcon />
                  Preview
                </Link>
              </DropdownMenuItem>
              {row.original.canDelete ? (
                <DropdownMenuItem
                  onClick={() =>
                    setQuizPendingDelete({
                      ids: [row.original._id],
                      label: row.original.title,
                      count: 1,
                    })
                  }
                  variant="destructive"
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled variant="destructive">
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {row.original.deleteDisabledReason}
                  </TooltipContent>
                </Tooltip>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ] as ColumnDef<AdminQuizRow>[];

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Sample Quizzes</h1>
            <p className="text-muted-foreground">
              Publish public practice quizzes for the resources section.
            </p>
          </div>

          <Button asChild>
            <Link href={"/admin/quizzes/new" as Route}>Create Sample Quiz</Link>
          </Button>
        </div>

        {quizzes !== undefined && quizzes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No sample quizzes yet</EmptyTitle>
              <EmptyDescription>
                Publish a practice quiz so candidates can explore the platform.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <DataTable
            columns={columns}
            data={(quizzes ?? []) as AdminQuizRow[]}
            isLoading={quizzes === undefined}
            searchPlaceholder="Search quiz title…"
            emptyMessage="No sample quizzes found."
            isRowSelectable={(row) => row.canDelete}
            renderToolbarExtras={({ selectedRows }) =>
              selectedRows.length > 0 ? (
                <Button
                  onClick={() =>
                    setQuizPendingDelete({
                      ids: selectedRows.map((row) => row._id),
                      label:
                        selectedRows.length === 1
                          ? selectedRows[0]!.title
                          : `${selectedRows.length} quizzes`,
                      count: selectedRows.length,
                    })
                  }
                  variant="destructive"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete Selected
                </Button>
              ) : null
            }
          />
        )}
      </div>

      <AlertDialog
        open={quizPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setQuizPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {quizPendingDelete?.count === 1
                ? "Delete this quiz?"
                : "Delete selected quizzes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {quizPendingDelete
                ? quizPendingDelete.count === 1
                  ? `This will permanently remove "${quizPendingDelete.label}" if it has never been assigned or attempted.`
                  : `This will permanently remove ${quizPendingDelete.count} selected quizzes.`
                : "This quiz will be permanently removed if it has never been assigned or attempted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || quizPendingDelete === null}
              onClick={() => {
                if (!quizPendingDelete) {
                  return;
                }

                startDeleteTransition(async () => {
                  try {
                    await Promise.all(
                      quizPendingDelete.ids.map((quizId) =>
                        removeQuiz({ quizId })
                      )
                    );
                    toast.success(
                      quizPendingDelete.count === 1
                        ? "Quiz deleted"
                        : `${quizPendingDelete.count} quizzes deleted`
                    );
                    setQuizPendingDelete(null);
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to delete quiz";
                    toast.error(message);
                  }
                });
              }}
              variant="destructive"
            >
              Delete quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
