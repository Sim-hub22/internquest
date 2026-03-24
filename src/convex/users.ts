import { UserJSON } from "@clerk/nextjs/server";
import { ConvexError, Validator, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  internalMutation,
  mutation,
  query,
} from "@/convex/_generated/server";
import { getCurrentUser, requireUser } from "@/convex/lib/auth";

// ─── Public queries ───────────────────────────────────────────────────────────

/** Get the current authenticated user's document. */
export const current = query({
  args: {},
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    return await getCurrentUser(ctx);
  },
});

/** Get a user by their Convex ID (e.g., for viewing candidate profiles). */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db.get(args.id);
  },
});

/** Get a user by their Clerk ID. */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

/** Update the current user's mutable profile fields. */
export const update = mutation({
  args: {
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ─── Internal mutations (Clerk webhook) ──────────────────────────────────────

/** Upsert a user from a Clerk webhook event (user.created / user.updated). */
export const upsertFromClerk = internalMutation({
  args: {
    data: v.any() as Validator<UserJSON>,
    role: v.optional(
      v.union(
        v.literal("candidate"),
        v.literal("recruiter"),
        v.literal("admin")
      )
    ),
    onboardingComplete: v.optional(v.boolean()),
    isSuspended: v.optional(v.boolean()),
  },
  handler: async (ctx, { data, role, onboardingComplete, isSuspended }) => {
    const now = Date.now();
    const primaryEmail =
      data.email_addresses?.find(
        (e: { id: string; email_address: string }) =>
          e.id === data.primary_email_address_id
      )?.email_address ?? "";

    const existing = await userByClerkId(ctx, data.id);

    if (!existing) {
      await ctx.db.insert("users", {
        clerkId: data.id,
        username: data.username ?? data.id,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        email: primaryEmail,
        imageUrl: data.image_url ?? undefined,
        role: role ?? undefined,
        onboardingComplete: onboardingComplete ?? false,
        isSuspended: isSuspended ?? false,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const patch: Partial<Doc<"users">> & { updatedAt: number } = {
        username: data.username ?? existing.username,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        email: primaryEmail || existing.email,
        imageUrl: data.image_url ?? existing.imageUrl,
        updatedAt: now,
      };
      if (role !== undefined) patch.role = role;
      if (onboardingComplete !== undefined)
        patch.onboardingComplete = onboardingComplete;
      if (isSuspended !== undefined) patch.isSuspended = isSuspended;
      await ctx.db.patch(existing._id, patch);
    }
  },
});

/** Delete a user from a Clerk webhook event (user.deleted). */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await userByClerkId(ctx, clerkUserId);
    if (user) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(`No Convex user found for Clerk ID: ${clerkUserId}`);
    }
  },
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

export async function userByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/**
 * @deprecated Use getCurrentUser from lib/auth.ts instead.
 * Kept for backward compatibility during migration.
 */
export async function getCurrentUserOrThrow(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  const user = await userByClerkId(ctx, identity.subject);
  if (!user) throw new ConvexError("User record not found");
  return user;
}

export type { Id };
