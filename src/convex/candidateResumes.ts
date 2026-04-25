import { ConvexError, v } from "convex/values";

import { Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { getUploadedPdfValidationError } from "@/convex/applications";
import { requireRole } from "@/convex/lib/auth";
import {
  MAX_ACTIVE_CANDIDATE_RESUMES,
  deriveResumeLabel,
} from "@/convex/lib/resumeLibrary";

async function getOwnedResume(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  candidateResumeId: Id<"candidateResumes">
) {
  const resume = await ctx.db.get(candidateResumeId);

  if (!resume) {
    throw new ConvexError("Resume not found");
  }

  if (resume.userId !== userId) {
    throw new ConvexError("FORBIDDEN");
  }

  return resume;
}

async function listActiveResumesForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  return await ctx.db
    .query("candidateResumes")
    .withIndex("by_userId_and_isArchived", (q) =>
      q.eq("userId", userId).eq("isArchived", false)
    )
    .order("desc")
    .take(MAX_ACTIVE_CANDIDATE_RESUMES + 1);
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const candidate = await requireRole(ctx, "candidate");
    const resumes = await ctx.db
      .query("candidateResumes")
      .withIndex("by_userId_and_isArchived", (q) =>
        q.eq("userId", candidate._id).eq("isArchived", false)
      )
      .order("desc")
      .take(MAX_ACTIVE_CANDIDATE_RESUMES);

    return await Promise.all(
      resumes.map(async (resume) => ({
        ...resume,
        url: await ctx.storage.getUrl(resume.storageId),
      }))
    );
  },
});

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    originalFilename: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const activeResumes = await listActiveResumesForUser(ctx, candidate._id);
    const originalFilename = args.originalFilename.trim() || "resume.pdf";

    if (activeResumes.length >= MAX_ACTIVE_CANDIDATE_RESUMES) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(
        `You can save up to ${MAX_ACTIVE_CANDIDATE_RESUMES} resumes`
      );
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);

    if (!metadata) {
      throw new ConvexError("Resume upload not found");
    }

    const validationError = getUploadedPdfValidationError(metadata, "Resume");

    if (validationError) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(validationError);
    }

    const contentType = metadata.contentType?.toLowerCase();
    if (!contentType && !originalFilename.toLowerCase().endsWith(".pdf")) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("Resume must be a PDF file");
    }

    const now = Date.now();
    const candidateResumeId = await ctx.db.insert("candidateResumes", {
      userId: candidate._id,
      storageId: args.storageId,
      originalFilename,
      label: deriveResumeLabel(originalFilename, args.label),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      candidateResumeId,
      storageId: args.storageId,
    };
  },
});

export const rename = mutation({
  args: {
    candidateResumeId: v.id("candidateResumes"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const resume = await getOwnedResume(
      ctx,
      candidate._id,
      args.candidateResumeId
    );

    if (resume.isArchived) {
      throw new ConvexError("Resume not found");
    }

    const nextLabel = args.label.trim();

    if (!nextLabel) {
      throw new ConvexError("Resume label is required");
    }

    await ctx.db.patch(resume._id, {
      label: nextLabel,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    candidateResumeId: v.id("candidateResumes"),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const resume = await getOwnedResume(
      ctx,
      candidate._id,
      args.candidateResumeId
    );

    if (resume.isArchived) {
      return { removedFromLibrary: true, archived: true };
    }

    const existingApplication = await ctx.db
      .query("applications")
      .withIndex("by_candidateResumeId", (q) =>
        q.eq("candidateResumeId", resume._id)
      )
      .take(1);

    if (existingApplication.length > 0) {
      await ctx.db.patch(resume._id, {
        isArchived: true,
        updatedAt: Date.now(),
      });

      return { removedFromLibrary: true, archived: true };
    }

    await ctx.db.delete(resume._id);
    await ctx.storage.delete(resume.storageId);

    return { removedFromLibrary: true, archived: false };
  },
});
