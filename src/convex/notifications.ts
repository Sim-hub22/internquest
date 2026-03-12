import { v } from "convex/values";

import { Doc } from "@/convex/_generated/dataModel";
import { mutation, query } from "@/convex/_generated/server";
import { requireUser } from "@/convex/lib/auth";

/** List the current user's unread notifications (most recent first, max 20). */
export const listUnread = query({
  args: {},
  handler: async (ctx): Promise<Doc<"notifications">[]> => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .order("desc")
      .take(20);
  },
});

/** List all of the current user's notifications with pagination. */
export const list = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const results = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return results;
  },
});

/** Count of unread notifications for the current user. */
export const unreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

/** Mark a single notification as read. */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      return null;
    }
    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

/** Mark all of the current user's notifications as read. */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
    return null;
  },
});
