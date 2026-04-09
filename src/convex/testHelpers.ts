"use node";

import { internalAction } from "@/convex/_generated/server";

export const createTestPdfStorage = internalAction({
  args: {},
  handler: async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["%PDF-1.4\n% test file\n"], {
        type: "application/pdf",
      })
    );

    return storageId;
  },
});

export const createTestLargePdfStorage = internalAction({
  args: {},
  handler: async (ctx) => {
    const payload = new Uint8Array(5 * 1024 * 1024 + 1);
    payload.set(new TextEncoder().encode("%PDF-1.4\n"));

    const storageId = await ctx.storage.store(
      new Blob([payload], {
        type: "application/pdf",
      })
    );

    return storageId;
  },
});

export const createTestTextStorage = internalAction({
  args: {},
  handler: async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["plain text"], {
        type: "text/plain",
      })
    );

    return storageId;
  },
});

export const createTestImageStorage = internalAction({
  args: {},
  handler: async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["fake image"], {
        type: "image/png",
      })
    );

    return storageId;
  },
});
