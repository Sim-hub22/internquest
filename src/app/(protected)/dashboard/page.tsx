import type { Route } from "next";
import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

/**
 * /dashboard is the Clerk sign-in fallback redirect target.
 * This page reads the user's role from their session claims and
 * immediately redirects them to the correct role-specific dashboard.
 * If onboarding is not complete, the middleware will have already
 * redirected to /onboarding before this page is reached.
 */
export default async function DashboardRedirectPage() {
  "use no memo";
  const { sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role as string | undefined;

  if (role === "candidate") {
    redirect("/candidate/dashboard" as Route);
  }

  if (role === "recruiter") {
    redirect("/recruiter/dashboard" as Route);
  }

  if (role === "admin") {
    redirect("/admin/dashboard" as Route);
  }

  // Fallback: onboarding not complete or role not set — middleware handles
  // this, but redirect defensively just in case.
  redirect("/onboarding" as Route);
}
