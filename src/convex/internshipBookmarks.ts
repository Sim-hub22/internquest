import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { getRecruiterFacingInternshipStatus } from "@/convex/internships";
import { requireRole } from "@/convex/lib/auth";

const MAX_BOOKMARKS_LIMIT = 100;

function normalizeLimit(limit: number) {
  return Math.min(Math.max(Math.floor(limit), 1), MAX_BOOKMARKS_LIMIT);
}

async function getBookmark(
  ctx: QueryCtx | MutationCtx,
  candidateId: Id<"users">,
  internshipId: Id<"internships">
) {
  return await ctx.db
    .query("internshipBookmarks")
    .withIndex("by_candidate_and_internship", (q) =>
      q.eq("candidateId", candidateId).eq("internshipId", internshipId)
    )
    .unique();
}

async function isInternshipCurrentlyAvailable(
  ctx: QueryCtx | MutationCtx,
  internship: Doc<"internships"> | null,
  now = Date.now()
) {
  if (
    !internship ||
    getRecruiterFacingInternshipStatus(internship, now) !== "open"
  ) {
    return false;
  }

  const recruiter = await ctx.db.get(internship.recruiterId);
  return recruiter !== null;
}

function getUnavailableReason(
  internship: Doc<"internships"> | null,
  now = Date.now()
) {
  if (!internship) {
    return "Internship removed";
  }

  if (internship.status === "open" && internship.applicationDeadline <= now) {
    return "Deadline passed";
  }

  if (internship.status !== "open") {
    return "Applications closed";
  }

  return "Unavailable";
}

function summarizeInternship(internship: Doc<"internships"> | null) {
  if (!internship) {
    return null;
  }

  return {
    _id: internship._id,
    title: internship.title,
    company: internship.company,
    category: internship.category,
    locationType: internship.locationType,
    duration: internship.duration,
    stipend: internship.stipend,
    status: internship.status,
    applicationDeadline: internship.applicationDeadline,
  };
}

export const getForCurrentCandidateByInternship = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const bookmark = await getBookmark(ctx, candidate._id, args.internshipId);

    return {
      isBookmarked: bookmark !== null,
      bookmarkId: bookmark?._id ?? null,
      createdAt: bookmark?.createdAt ?? null,
    };
  },
});

export const listForCurrentCandidate = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const limit = normalizeLimit(args.limit);
    const bookmarks = await ctx.db
      .query("internshipBookmarks")
      .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
      .order("desc")
      .take(limit);
    const now = Date.now();

    return await Promise.all(
      bookmarks.map(async (bookmark) => {
        const internship = await ctx.db.get(bookmark.internshipId);
        const isAvailable = await isInternshipCurrentlyAvailable(
          ctx,
          internship,
          now
        );

        return {
          bookmarkId: bookmark._id,
          internshipId: bookmark.internshipId,
          savedAt: bookmark.createdAt,
          isAvailable,
          unavailableReason: isAvailable
            ? null
            : getUnavailableReason(internship, now),
          internship: summarizeInternship(internship),
        };
      })
    );
  },
});

export const toggle = mutation({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const existingBookmark = await getBookmark(
      ctx,
      candidate._id,
      args.internshipId
    );

    if (existingBookmark) {
      await ctx.db.delete(existingBookmark._id);
      return { isBookmarked: false };
    }

    const internship = await ctx.db.get(args.internshipId);

    if (!(await isInternshipCurrentlyAvailable(ctx, internship))) {
      throw new ConvexError("Internship is not available to bookmark");
    }

    await ctx.db.insert("internshipBookmarks", {
      candidateId: candidate._id,
      internshipId: args.internshipId,
      createdAt: Date.now(),
    });

    return { isBookmarked: true };
  },
});
