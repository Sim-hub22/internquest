import type { UserJSON } from "@clerk/nextjs/server";
import { v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { parseClerkRole } from "@/convex/users";

export const syncUsersFromClerk = internalAction({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("Missing CLERK_SECRET_KEY in Convex environment");
    }

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 100), 1), 500);
    const offset = Math.max(Math.floor(args.offset ?? 0), 0);

    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch Clerk users: ${response.status} ${errorText}`
      );
    }

    const users = (await response.json()) as UserJSON[];

    for (const user of users) {
      const role = parseClerkRole(user.public_metadata?.role);
      const onboardingComplete =
        typeof user.public_metadata?.onboardingComplete === "boolean"
          ? user.public_metadata.onboardingComplete
          : undefined;

      await ctx.runMutation(internal.users.upsertFromClerk, {
        data: user,
        role,
        onboardingComplete,
      });
    }

    return {
      processed: users.length,
      nextOffset: offset + users.length,
      done: users.length < limit,
    };
  },
});
