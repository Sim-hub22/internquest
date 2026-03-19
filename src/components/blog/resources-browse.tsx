"use client";
/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery, useQuery } from "convex/react";
import { ArrowRightIcon, BookOpenIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { BlogCategory } from "@/lib/blog";
import { BLOG_CATEGORIES, toBlogCategoryLabel } from "@/lib/blog";

type ResourcesBrowseProps = {
  preloadedPosts: Preloaded<typeof api.blogPosts.listPublic>;
};

const PAGE_SIZE = 9;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

export function ResourcesBrowse({ preloadedPosts }: ResourcesBrowseProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const trimmedSearch = search.trim();
  const paginationOpts = {
    numItems: PAGE_SIZE,
    cursor,
  };
  const isDefaultState =
    !trimmedSearch && category === "all" && cursor === null;

  const defaultResults = usePreloadedQuery(preloadedPosts);
  const listResults = useQuery(
    api.blogPosts.listPublic,
    !trimmedSearch && !isDefaultState
      ? {
          category: category === "all" ? undefined : category,
          paginationOpts,
        }
      : "skip"
  );
  const searchResults = useQuery(
    api.blogPosts.searchPublic,
    trimmedSearch
      ? {
          query: trimmedSearch,
          category: category === "all" ? undefined : category,
          paginationOpts,
        }
      : "skip"
  );

  const results = trimmedSearch
    ? searchResults
    : isDefaultState
      ? defaultResults
      : listResults;

  const resetPagination = () => {
    setCursor(null);
    setCursorHistory([]);
  };

  const featuredPost = results?.page[0] ?? null;
  const remainingPosts = results?.page.slice(1) ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.10),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,1),_rgba(3,7,18,1))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 lg:px-6 lg:py-14">
        <section className="grid gap-6 rounded-[2rem] border bg-background/85 p-6 shadow-sm backdrop-blur lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-5">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              InternQuest Resources
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
                Practical guidance for candidates who want sharper applications
                and calmer interviews.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Explore editorial guides, interview prep notes, resume
                strategies, and industry-facing advice written for the public
                learning hub.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search resource titles..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPagination();
                  }}
                />
              </div>

              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as "all" | BlogCategory);
                  resetPagination();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {BLOG_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {toBlogCategoryLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] bg-slate-950 p-5 text-slate-50">
            <div className="space-y-2">
              <p className="text-sm tracking-[0.22em] text-amber-200/80 uppercase">
                Practice Mode
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Want hands-on prep too?
              </h2>
              <p className="text-sm leading-6 text-slate-300">
                Switch from reading to doing with the public sample quizzes in
                the resources section.
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <BookOpenIcon className="size-4" />
                Sample quizzes are open to signed-in users
              </div>
              <Button
                asChild
                className="w-fit bg-amber-400 text-slate-950 hover:bg-amber-300"
              >
                <Link href={"/resources/quizzes" as Route}>
                  Explore Quizzes
                  <ArrowRightIcon />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {results === undefined ? (
          <div className="grid gap-6">
            <Skeleton className="h-[26rem] w-full rounded-[2rem]" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`resource-skeleton-${index}`}
                  className="h-72 w-full rounded-[1.5rem]"
                />
              ))}
            </div>
          </div>
        ) : results.page.length === 0 ? (
          <Empty className="rounded-[2rem] border bg-background/80 py-16">
            <EmptyHeader>
              <EmptyTitle>No resources found</EmptyTitle>
              <EmptyDescription>
                Try a broader title search or switch back to all categories.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {featuredPost ? (
              <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="overflow-hidden rounded-[2rem] border bg-card shadow-sm">
                  {featuredPost.coverImageUrl ? (
                    <img
                      src={featuredPost.coverImageUrl}
                      alt={featuredPost.title}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[16/9] bg-[linear-gradient(135deg,_rgba(249,115,22,0.18),_rgba(250,204,21,0.12),_rgba(255,255,255,0.04))]" />
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-[2rem] border bg-background p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {toBlogCategoryLabel(featuredPost.category)}
                      </Badge>
                      {featuredPost.publishedAt ? (
                        <span className="text-sm text-muted-foreground">
                          {DATE_FORMATTER.format(
                            new Date(featuredPost.publishedAt)
                          )}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl font-semibold tracking-tight">
                        {featuredPost.title}
                      </h2>
                      <p className="text-base leading-7 text-muted-foreground">
                        {featuredPost.excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6">
                    <Button asChild>
                      <Link href={`/resources/${featuredPost.slug}` as Route}>
                        Read Featured Resource
                        <ArrowRightIcon />
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {remainingPosts.map((post) => (
                <article
                  key={post._id}
                  className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-background shadow-sm transition-transform hover:-translate-y-1"
                >
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[16/10] bg-[linear-gradient(140deg,_rgba(251,191,36,0.18),_rgba(255,255,255,0.06),_rgba(59,130,246,0.10))]" />
                  )}
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {toBlogCategoryLabel(post.category)}
                      </Badge>
                      {post.publishedAt ? (
                        <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                          {DATE_FORMATTER.format(new Date(post.publishedAt))}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {post.title}
                      </h3>
                      <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="mt-auto pt-2">
                      <Button asChild variant="ghost" className="-ml-3">
                        <Link href={`/resources/${post.slug}` as Route}>
                          Open Resource
                          <ArrowRightIcon />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setCursorHistory((previous) => {
                        const updated = [...previous];
                        const previousCursor = updated.pop() ?? null;
                        setCursor(previousCursor);
                        return updated;
                      });
                    }}
                    aria-disabled={cursorHistory.length === 0}
                    className={
                      cursorHistory.length === 0
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (!results.continueCursor || results.isDone) {
                        return;
                      }

                      setCursorHistory((previous) => [...previous, cursor]);
                      setCursor(results.continueCursor);
                    }}
                    aria-disabled={results.isDone}
                    className={
                      results.isDone ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}
      </div>
    </main>
  );
}
