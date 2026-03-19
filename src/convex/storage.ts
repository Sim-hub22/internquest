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

export const resolveImageUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<string> => {
    await requireUser(ctx);

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded file not found");
    }

    if (!metadata.contentType?.startsWith("image/")) {
      throw new Error("Uploaded file must be an image");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Uploaded image URL could not be generated");
    }

    return url;
  },
});
