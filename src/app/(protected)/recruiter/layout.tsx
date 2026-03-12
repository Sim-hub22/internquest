import type { Route } from "next";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { auth } from "@clerk/nextjs/server";

export default async function RecruiterLayout({ children }: PropsWithChildren) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role !== "recruiter") {
    const target =
      role === "candidate"
        ? "/candidate/dashboard"
        : role === "admin"
          ? "/admin/dashboard"
          : "/onboarding";
    redirect(target as Route);
  }

  return <>{children}</>;
}
