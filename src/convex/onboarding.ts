import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { internalAction, mutation } from "@/convex/_generated/server";
import { getCurrentUser } from "@/convex/lib/auth";

export const complete = mutation({
  args: {
    role: v.union(v.literal("candidate"), v.literal("recruiter")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User record not found");
    }

    await ctx.db.patch(user._id, {
      role: args.role,
      onboardingComplete: true,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.onboarding.syncClerkMetadata, {
      clerkUserId: identity.subject,
      role: args.role,
      onboardingComplete: true,
    });

    return null;
  },
});

export const syncClerkMetadata = internalAction({
  args: {
    clerkUserId: v.string(),
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
  handler: async (_ctx, args) => {
    const { clerkUserId, role, onboardingComplete, isSuspended } = args;

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("Missing CLERK_SECRET_KEY in Convex environment");
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${clerkUserId}/metadata`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: {
            ...(onboardingComplete === undefined ? {} : { onboardingComplete }),
            ...(role === undefined ? {} : { role }),
            ...(isSuspended === undefined ? {} : { isSuspended }),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update Clerk metadata: ${response.status} ${errorText}`
      );
    }

    return null;
  },
});
