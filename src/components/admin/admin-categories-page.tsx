"use client";

import { useMemo, useState, useTransition } from "react";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckIcon, ClipboardListIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CategoryStatus = "pending" | "approved" | "rejected";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function statusVariant(status: CategoryStatus) {
  if (status === "approved") {
    return "default";
  }

  if (status === "rejected") {
    return "destructive";
  }

  return "secondary";
}

export function AdminCategoriesPage() {
  const { isAuthenticated } = useConvexAuth();
  const categories = useQuery(
    api.internshipCategories.listForAdmin,
    isAuthenticated ? {} : "skip"
  );
  const reviewCategory = useMutation(api.internshipCategories.review);
  const seedBuiltIns = useMutation(api.internshipCategories.seedBuiltIns);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const groupedCategories = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];

    for (const category of categories ?? []) {
      if (category.status === "pending") {
        pending.push(category);
      } else if (category.status === "approved") {
        approved.push(category);
      } else {
        rejected.push(category);
      }
    }

    return { pending, approved, rejected };
  }, [categories]);

  const handleReview = (
    categoryId: Id<"internshipCategories"> | null,
    status: "approved" | "rejected"
  ) => {
    if (!categoryId) {
      return;
    }

    startTransition(async () => {
      try {
        await reviewCategory({
          categoryId,
          status,
          adminNotes: notesById[categoryId]?.trim() || undefined,
        });
        toast.success(
          status === "approved" ? "Category approved" : "Category rejected"
        );
      } catch (error) {
        console.error(error);
        toast.error("Unable to update category request");
      }
    });
  };

  const handleSeedBuiltIns = () => {
    startTransition(async () => {
      try {
        const result = await seedBuiltIns({});
        toast.success(
          `Built-in categories synced (${result.inserted} new, ${result.updated} updated)`
        );
      } catch (error) {
        console.error(error);
        toast.error("Unable to sync built-in categories");
      }
    });
  };

  if (!categories) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Internship Categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review recruiter category requests before they appear in public
            filters and matching.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSeedBuiltIns}
          disabled={isPending}
        >
          Sync built-ins
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Pending Requests</h2>
          <Badge variant="secondary">{groupedCategories.pending.length}</Badge>
        </div>

        {groupedCategories.pending.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>No pending requests</EmptyTitle>
              <EmptyDescription>
                New recruiter category requests will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y rounded-md border">
            {groupedCategories.pending.map((category) => (
              <div
                key={category.slug}
                className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{category.name}</h3>
                    <Badge variant={statusVariant(category.status)}>
                      {category.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Slug: {category.slug}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requested {DATE_FORMATTER.format(category.createdAt)}
                  </p>
                </div>

                <Input
                  value={notesById[category._id ?? category.slug] ?? ""}
                  onChange={(event) =>
                    setNotesById((previous) => ({
                      ...previous,
                      [category._id ?? category.slug]: event.target.value,
                    }))
                  }
                  placeholder="Optional admin note"
                />

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleReview(category._id, "approved")}
                    disabled={isPending}
                  >
                    <CheckIcon />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReview(category._id, "rejected")}
                    disabled={isPending}
                  >
                    <XIcon />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {[
          ["Approved", groupedCategories.approved],
          ["Rejected", groupedCategories.rejected],
        ].map(([title, rows]) => (
          <div key={title as string} className="rounded-md border">
            <div className="border-b p-4">
              <h2 className="text-sm font-medium">{title as string}</h2>
            </div>
            <div className="divide-y">
              {(rows as typeof groupedCategories.approved).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No {String(title).toLowerCase()} categories.
                </p>
              ) : (
                (rows as typeof groupedCategories.approved).map((category) => (
                  <div
                    key={`${category.status}:${category.slug}`}
                    className="flex flex-wrap items-center justify-between gap-2 p-4"
                  >
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.slug}
                      </p>
                    </div>
                    <Badge variant={statusVariant(category.status)}>
                      {category.isBuiltIn ? "built-in" : category.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
