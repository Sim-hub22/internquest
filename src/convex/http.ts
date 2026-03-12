import { WebhookEvent } from "@clerk/nextjs/server";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "@/convex/_generated/api";
import { httpAction } from "@/convex/_generated/server";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const metadata = event.data.public_metadata as Record<string, unknown>;
        const role = parseRole(metadata?.role);
        const onboardingComplete =
          typeof metadata?.onboardingComplete === "boolean"
            ? metadata.onboardingComplete
            : undefined;

        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
          role,
          onboardingComplete,
        });
        break;
      }

      case "user.deleted": {
        const clerkUserId = event.data.id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }

      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

function parseRole(
  value: unknown
): "candidate" | "recruiter" | "admin" | undefined {
  if (value === "candidate" || value === "recruiter" || value === "admin") {
    return value;
  }
  return undefined;
}

export default http;
