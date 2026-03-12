import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createTestUser(clerkId: string) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: "Onboarding User",
    email: `${clerkId}@example.com`,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/onboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.CLERK_SECRET_KEY;
  });

  it("rejects unauthenticated onboarding completion", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.onboarding.complete, { role: "candidate" })
    ).rejects.toThrow("Unauthenticated");
  });

  it("updates the user and syncs Clerk public metadata", async () => {
    const t = convexTest(schema, modules);
    const identity = { subject: "clerk_onboarding_1" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);
    process.env.CLERK_SECRET_KEY = "test_clerk_secret";

    await t.run(async (ctx) => {
      await ctx.db.insert("users", createTestUser(identity.subject));
    });

    await t.withIdentity(identity).mutation(api.onboarding.complete, {
      role: "candidate",
    });

    const updatedUser = await t
      .withIdentity(identity)
      .query(api.users.current, {});

    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.role).toBe("candidate");
    expect(updatedUser?.onboardingComplete).toBe(true);

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.clerk.com/v1/users/${identity.subject}/metadata`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer test_clerk_secret",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          public_metadata: {
            onboardingComplete: true,
            role: "candidate",
          },
        }),
      })
    );
  });
});
