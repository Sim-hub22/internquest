import { UserJSON } from "@clerk/nextjs/server";
import { Validator, v } from "convex/values";

import {
  MutationCtx,
  QueryCtx,
  internalMutation,
  query,
} from "@/convex/_generated/server";

type OnboardingRole = "candidate" | "recruiter";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: {
    data: v.any() as Validator<UserJSON>, // no runtime validation, trust Clerk
    role: v.optional(v.union(v.literal("candidate"), v.literal("recruiter"))),
    onboardingComplete: v.optional(v.boolean()),
  },
  async handler(ctx, { data, role, onboardingComplete }) {
    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
      ...(role ? { role } : {}),
      ...(onboardingComplete !== undefined ? { onboardingComplete } : {}),
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

export function parseClerkRole(value: unknown): OnboardingRole | undefined {
  if (value === "candidate" || value === "recruiter") {
    return value;
  }
  return undefined;
}

async function userByExternalId(
  ctx: QueryCtx | MutationCtx,
  externalId: string
) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}
