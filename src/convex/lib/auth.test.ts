import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { requireAuth, requireRole, requireUser } from "@/convex/lib/auth";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createTestUser(
  clerkId: string,
  role?: "candidate" | "recruiter" | "admin"
) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: "Test User",
    email: `${clerkId}@example.com`,
    onboardingComplete: role !== undefined,
    createdAt: now,
    updatedAt: now,
    ...(role ? { role } : {}),
  };
}

describe("convex/lib/auth", () => {
  it("rejects unauthenticated access in requireAuth", async () => {
    const t = convexTest(schema, modules);

    await expect(t.run(async (ctx) => requireAuth(ctx))).rejects.toThrow(
      "UNAUTHENTICATED"
    );
  });

  it("returns the current Convex user for requireUser", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "clerk_candidate_1" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "candidate")
      );
    });

    const user = await t
      .withIdentity(identity)
      .run(async (ctx) => requireUser(ctx));

    expect(user.clerkId).toBe(identity.subject);
    expect(user.role).toBe("candidate");
  });

  it("rejects users without the required role", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "clerk_candidate_2" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createTestUser(identity.subject, "candidate")
      );
    });

    await expect(
      t.withIdentity(identity).run(async (ctx) => requireRole(ctx, "recruiter"))
    ).rejects.toThrow("FORBIDDEN");
  });
});
