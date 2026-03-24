import { ConvexError } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { MutationCtx } from "@/convex/_generated/server";

function buildSuspensionReason(reason: string | undefined) {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : "Suspended by an administrator";
}

export async function suspendUserByAdmin(
  ctx: MutationCtx,
  adminId: Id<"users">,
  userId: Id<"users">,
  reason?: string
) {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new ConvexError("User not found");
  }

  if (user.role === "admin") {
    throw new ConvexError("Admin accounts cannot be suspended");
  }

  if (user._id === adminId) {
    throw new ConvexError("You cannot suspend your own account");
  }

  const now = Date.now();

  await ctx.db.patch(user._id, {
    isSuspended: true,
    suspensionReason: buildSuspensionReason(reason),
    suspendedAt: now,
    suspendedBy: adminId,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(0, internal.onboarding.syncClerkMetadata, {
    clerkUserId: user.clerkId,
    isSuspended: true,
  });

  return user;
}

export async function unsuspendUserByAdmin(
  ctx: MutationCtx,
  adminId: Id<"users">,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new ConvexError("User not found");
  }

  if (user.role === "admin") {
    throw new ConvexError("Admin accounts cannot be suspended");
  }

  if (user._id === adminId) {
    throw new ConvexError("You cannot unsuspend your own account");
  }

  await ctx.db.patch(user._id, {
    isSuspended: false,
    updatedAt: Date.now(),
  });

  await ctx.scheduler.runAfter(0, internal.onboarding.syncClerkMetadata, {
    clerkUserId: user.clerkId,
    isSuspended: false,
  });

  return user;
}

function buildModerationReason(reason: string | undefined) {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : "Closed by an administrator";
}

export async function closeInternshipByAdmin(
  ctx: MutationCtx,
  adminId: Id<"users">,
  internshipId: Id<"internships">,
  reason?: string
) {
  const internship = await ctx.db.get(internshipId);

  if (!internship) {
    throw new ConvexError("Internship not found");
  }

  const now = Date.now();

  await ctx.db.patch(internship._id, {
    status: "closed",
    isClosedByAdmin: true,
    adminModerationReason: buildModerationReason(reason),
    adminModeratedAt: now,
    adminModeratedBy: adminId,
    updatedAt: now,
  });

  return internship;
}

export async function unpublishBlogPostByAdmin(
  ctx: MutationCtx,
  postId: Id<"blogPosts">
) {
  const post = await ctx.db.get(postId);

  if (!post) {
    throw new ConvexError("Blog post not found");
  }

  await ctx.db.patch(post._id, {
    status: "draft",
    updatedAt: Date.now(),
  });

  return post;
}

export function hasReportAction(
  report: Pick<Doc<"reports">, "actionType" | "status">
) {
  return report.status === "resolved" && report.actionType !== undefined;
}
