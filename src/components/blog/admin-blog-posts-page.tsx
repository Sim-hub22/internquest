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
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BlogCategory } from "@/lib/blog";
import { toBlogCategoryLabel } from "@/lib/blog";

type StatusFilter = "all" | "draft" | "published";

type BlogDeleteTarget = {
  ids: Id<"blogPosts">[];
  label: string;
  count: number;
  hasPublished: boolean;
};

type BlogPostRow = {
  _id: Id<"blogPosts">;
  title: string;
  slug: string;
  category: BlogCategory;
  status: "draft" | "published";
  updatedAt: number;
  publishedAt?: number;
};

const columnHelper = createColumnHelper<BlogPostRow>();
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export function AdminBlogPostsPage() {
  const posts = useQuery(api.blogPosts.listForAdmin, {});
  const removePost = useMutation(api.blogPosts.remove);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [postPendingDelete, setPostPendingDelete] =
    useState<BlogDeleteTarget | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const filteredPosts =
    posts?.filter(
      (post) => statusFilter === "all" || post.status === statusFilter
    ) ?? [];

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
      cell: ({ row }) => (
        <div className="flex max-w-[20rem] min-w-0 flex-col gap-1 lg:max-w-[24rem]">
          <div className="truncate font-medium" title={row.original.title}>
            {row.original.title}
          </div>
          <div
            className="truncate text-xs text-muted-foreground"
            title={`/${row.original.slug}`}
          >
            /{row.original.slug}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: ({ getValue }) => (
        <Badge variant="outline">{toBlogCategoryLabel(getValue())}</Badge>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={getValue() === "published" ? "default" : "secondary"}>
          {getValue() === "published" ? "Published" : "Draft"}
        </Badge>
      ),
    }),
    columnHelper.accessor("updatedAt", {
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
    columnHelper.accessor("publishedAt", {
      header: "Published",
      cell: ({ getValue }) => {
        const publishedAt = getValue();
        return publishedAt
          ? DATE_FORMATTER.format(new Date(publishedAt))
          : "Not yet";
      },
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
                <Link href={`/admin/blog/${row.original._id}/edit` as Route}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/blog/${row.original._id}` as Route}>
                  <EyeIcon />
                  Preview
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setPostPendingDelete({
                    ids: [row.original._id],
                    label: row.original.title,
                    count: 1,
                    hasPublished: row.original.status === "published",
                  })
                }
                variant="destructive"
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ] as ColumnDef<BlogPostRow>[];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Blog & Resources</h1>
          <p className="max-w-2xl text-muted-foreground">
            Write public-facing guidance, publish editorial resources, and keep
            the learning hub fresh.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All posts</SelectItem>
              <SelectItem value="draft">Drafts only</SelectItem>
              <SelectItem value="published">Published only</SelectItem>
            </SelectContent>
          </Select>

          <Button asChild>
            <Link href={"/admin/blog/new" as Route}>Create Resource</Link>
          </Button>
        </div>
      </div>

      {posts !== undefined && posts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No resources yet</EmptyTitle>
            <EmptyDescription>
              Publish your first article to launch the public resources hub.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={filteredPosts as BlogPostRow[]}
          isLoading={posts === undefined}
          searchPlaceholder="Search resource title..."
          emptyMessage="No resources match that filter."
          renderToolbarExtras={({ selectedRows }) =>
            selectedRows.length > 0 ? (
              <Button
                onClick={() =>
                  setPostPendingDelete({
                    ids: selectedRows.map((row) => row._id),
                    label:
                      selectedRows.length === 1
                        ? selectedRows[0]!.title
                        : `${selectedRows.length} resources`,
                    count: selectedRows.length,
                    hasPublished: selectedRows.some(
                      (row) => row.status === "published"
                    ),
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
      <AlertDialog
        open={postPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPostPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {postPendingDelete?.count === 1
                ? "Delete this resource?"
                : "Delete selected resources?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {postPendingDelete
                ? postPendingDelete.count === 1
                  ? `This will permanently remove "${postPendingDelete.label}".`
                  : `This will permanently remove ${postPendingDelete.count} selected resources.`
                : "This action permanently removes the selected resources."}{" "}
              {postPendingDelete?.hasPublished
                ? "Published resources will disappear from the public resources hub immediately."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || postPendingDelete === null}
              onClick={() => {
                if (!postPendingDelete) {
                  return;
                }

                startDeleteTransition(async () => {
                  try {
                    await Promise.all(
                      postPendingDelete.ids.map((postId) =>
                        removePost({ postId })
                      )
                    );
                    toast.success(
                      postPendingDelete.count === 1
                        ? "Resource deleted"
                        : `${postPendingDelete.count} resources deleted`
                    );
                    setPostPendingDelete(null);
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to delete resource";
                    toast.error(message);
                  }
                });
              }}
              variant="destructive"
            >
              {postPendingDelete?.count === 1
                ? "Delete resource"
                : "Delete resources"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
