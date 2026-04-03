"use client";
/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { ReportContentButton } from "@/components/report-content-button";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { toBlogCategoryLabel } from "@/lib/blog";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export function ResourcePostPage({ slug }: { slug: string }) {
  const post = useQuery(api.blogPosts.getBySlug, { slug });

  if (post === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 lg:px-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-120 w-full rounded-[2rem]" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource unavailable</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={"/resources" as Route}>
                <ArrowLeftIcon />
                Back to resources
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,1))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(3,7,18,1))]">
      <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 lg:px-6 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost">
              <Link href={"/resources" as Route}>
                <ArrowLeftIcon />
                Back to resources
              </Link>
            </Button>
            <ReportContentButton targetId={post._id} targetType="blog_post" />
          </div>
          <Button asChild variant="outline">
            <Link href={"/resources/quizzes" as Route}>
              Try sample quizzes
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <header className="space-y-5 rounded-[2rem] border bg-background p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {toBlogCategoryLabel(post.category)}
            </Badge>
            {post.publishedAt ? (
              <span className="text-sm text-muted-foreground">
                {DATE_FORMATTER.format(new Date(post.publishedAt))}
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
              {post.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {post.excerpt}
            </p>
          </div>

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </header>

        <div className="overflow-hidden rounded-[2rem] border bg-background shadow-sm">
          {post.coverImageUrl ? (
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="aspect-16/8 w-full object-cover"
            />
          ) : null}

          <div className="p-6 lg:p-8">
            <RichTextContent html={post.content} className="prose-lg" />
          </div>
        </div>
      </article>
    </main>
  );
}
