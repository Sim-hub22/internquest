import { ConvexError } from "convex/values";

import { Doc } from "@/convex/_generated/dataModel";
import { MutationCtx, QueryCtx } from "@/convex/_generated/server";

type UserRole = "candidate" | "recruiter" | "admin";

/**
 * Returns the current user's Convex document, or null if not authenticated
 * or no user record exists.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Returns the authenticated user's identity or throws UNAUTHENTICATED.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("UNAUTHENTICATED");
  }
  return identity;
}

/**
 * Returns the current user document or throws UNAUTHENTICATED / NOT_FOUND.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  await requireAuth(ctx);
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("User record not found");
  }
  return user;
}

/**
 * Returns the current user document if it has the specified role,
 * or throws UNAUTHENTICATED / FORBIDDEN.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: UserRole
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== role) {
    throw new ConvexError("FORBIDDEN");
  }
  return user;
}

/**
 * Returns the current user document if it has any of the specified roles,
 * or throws UNAUTHENTICATED / FORBIDDEN.
 */
export async function requireAnyRole(
  ctx: QueryCtx | MutationCtx,
  roles: UserRole[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.role || !roles.includes(user.role)) {
    throw new ConvexError("FORBIDDEN");
  }
  return user;
}
