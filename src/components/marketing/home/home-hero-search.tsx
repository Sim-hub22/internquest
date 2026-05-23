"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ArrowRightIcon, SearchIcon } from "lucide-react";
import { useQuery } from "convex/react";

import {
  getCategoryOptions,
} from "@/components/internships/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type HomeHeroSearchProps = {
  className?: string;
  defaultQuery?: string;
  defaultCategory?: string;
};

export function HomeHeroSearch({
  className,
  defaultQuery = "",
  defaultCategory = "all",
}: HomeHeroSearchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory);
  const approvedCategories = useQuery(api.internshipCategories.listApproved);
  const categoryOptions = getCategoryOptions(approvedCategories);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams();

    if (trimmedQuery) {
      params.set("query", trimmedQuery);
    }

    if (category !== "all") {
      params.set("category", category);
    }

    const href =
      params.size > 0
        ? (`/internships?${params.toString()}` as Route)
        : ("/internships" as Route);

    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-[1.75rem] border border-slate-200 bg-white/92 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75",
        className
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(12rem,0.8fr)_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">Search internships</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, skill, or company"
            className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50 pr-4 pl-11 text-sm shadow-none placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900"
          />
        </label>

        <div>
          <span className="sr-only">Filter by category</span>
          <Select
            value={category}
            onValueChange={setCategory}
          >
            <SelectTrigger className="h-14 w-full rounded-[1.2rem] border-slate-200 bg-slate-50 px-4 text-sm shadow-none dark:border-slate-800 dark:bg-slate-900">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((item) => (
                <SelectItem key={item.slug} value={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-14 rounded-[1.2rem] bg-[#1447E6] px-6 text-white hover:bg-[#103CC4]"
        >
          {isPending ? "Searching..." : "Search"}
          <ArrowRightIcon />
        </Button>
      </div>
    </form>
  );
}
