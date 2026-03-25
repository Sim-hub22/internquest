"use client";
/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toBlogCategoryLabel } from "@/lib/blog";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export function OwnerBlogPostPreviewPage({
  postId,
}: {
  postId: Id<"blogPosts">;
}) {
  const preview = useQuery(api.blogPosts.getOwnerPreview, { postId });

  if (preview === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-112 w-full" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource preview unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={"/admin/blog" as Route}>Back to Blog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { post } = preview;

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={post.status === "published" ? "default" : "secondary"}
          >
            {post.status === "published" ? "Published" : "Draft"}
          </Badge>
          <Badge variant="outline">{toBlogCategoryLabel(post.category)}</Badge>
          {post.publishedAt ? (
            <Badge variant="outline">
              Published {DATE_FORMATTER.format(new Date(post.publishedAt))}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/admin/blog/${post._id}/edit` as Route}>
              Edit Draft
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={"/admin/blog" as Route}>Back to Blog</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border bg-card">
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="aspect-16/8 w-full object-cover"
          />
        ) : (
          <div className="h-56 bg-linear-to-br from-slate-100 via-white to-amber-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
        )}

        <div className="space-y-6 p-6 lg:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">
              {post.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {post.excerpt}
            </p>
          </div>

          <RichTextContent html={post.content} className="prose-lg" />
        </div>
      </div>
    </article>
  );
}
