import { v } from "convex/values";

import { mutation, query } from "@/convex/_generated/server";
import { requireUser } from "@/convex/lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});
