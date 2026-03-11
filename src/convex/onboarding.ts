import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { internalAction, mutation } from "@/convex/_generated/server";

export const complete = mutation({
  args: {
    role: v.union(v.literal("candidate"), v.literal("recruiter")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }

    await ctx.scheduler.runAfter(0, internal.onboarding.applyClerkMetadata, {
      clerkUserId: identity.subject,
      role: args.role,
    });

    return null;
  },
});

export const applyClerkMetadata = internalAction({
  args: {
    clerkUserId: v.string(),
    role: v.union(v.literal("candidate"), v.literal("recruiter")),
  },
  handler: async (_ctx, args) => {
    const { clerkUserId, role } = args;

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
            onboardingComplete: true,
            role,
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
