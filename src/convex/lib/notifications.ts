import { Id } from "@/convex/_generated/dataModel";
import { MutationCtx } from "@/convex/_generated/server";

type NotificationType =
  | "application_status"
  | "quiz_assigned"
  | "quiz_graded"
  | "new_internship"
  | "new_application"
  | "new_resource";

interface CreateNotificationArgs {
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedId?: string;
}

/**
 * Internal helper to insert a notification document.
 * Call this from mutations/actions to fan out notifications.
 */
export async function createNotification(
  ctx: MutationCtx,
  args: CreateNotificationArgs
): Promise<void> {
  const notification = {
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    isRead: false,
    createdAt: Date.now(),
  };

  await ctx.db.insert("notifications", {
    ...notification,
    ...(args.link ? { link: args.link } : {}),
    ...(args.relatedId ? { relatedId: args.relatedId } : {}),
  });
}
