"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { BookmarkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type InternshipBookmarkButtonProps = {
  internshipId: Id<"internships">;
  className?: string;
};

export function InternshipBookmarkButton({
  internshipId,
  className,
}: InternshipBookmarkButtonProps) {
  const [isToggling, setIsToggling] = useState(false);
  const currentUser = useQuery(api.users.current);
  const bookmarkState = useQuery(
    api.internshipBookmarks.getForCurrentCandidateByInternship,
    currentUser?.role === "candidate" && currentUser.isSuspended !== true
      ? { internshipId }
      : "skip"
  );
  const toggleBookmark = useMutation(api.internshipBookmarks.toggle);

  if (currentUser === undefined) {
    return (
      <Button
        className={className}
        disabled
        size="icon"
        type="button"
        variant="outline"
      >
        <BookmarkIcon />
        <span className="sr-only">Loading bookmark action</span>
      </Button>
    );
  }

  if (currentUser === null) {
    return (
      <Button asChild className={className} size="icon" variant="outline">
        <Link href={"/sign-in" as Route}>
          <BookmarkIcon />
          <span className="sr-only">Sign in to save internship</span>
        </Link>
      </Button>
    );
  }

  if (currentUser.role !== "candidate" || currentUser.isSuspended === true) {
    return null;
  }

  const isBookmarked = bookmarkState?.isBookmarked === true;

  const handleToggle = async () => {
    if (bookmarkState === undefined) {
      return;
    }

    setIsToggling(true);

    try {
      const result = await toggleBookmark({ internshipId });
      toast.success(
        result.isBookmarked
          ? "Internship saved to your dashboard"
          : "Internship removed from saved items"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update bookmark"
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Button
      aria-pressed={isBookmarked}
      className={cn(isBookmarked && "text-primary", className)}
      disabled={bookmarkState === undefined || isToggling}
      onClick={handleToggle}
      size="icon"
      type="button"
      variant={isBookmarked ? "secondary" : "outline"}
    >
      <BookmarkIcon className={isBookmarked ? "fill-current" : undefined} />
      <span className="sr-only">
        {isBookmarked ? "Remove saved internship" : "Save internship"}
      </span>
    </Button>
  );
}
