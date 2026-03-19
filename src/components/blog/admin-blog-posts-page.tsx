"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { ArrowUpDownIcon, EyeIcon, PencilIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredPosts = useMemo(() => {
    if (!posts) {
      return [];
    }

    if (statusFilter === "all") {
      return posts;
    }

    return posts.filter((post) => post.status === statusFilter);
  }, [posts, statusFilter]);

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
        <div className="space-y-1">
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/blog/${row.original._id}/edit` as Route}>
              <PencilIcon />
              Edit
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/blog/${row.original._id}/preview` as Route}>
              <EyeIcon />
              Preview
            </Link>
          </Button>
        </div>
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
        />
      )}
    </div>
  );
}
