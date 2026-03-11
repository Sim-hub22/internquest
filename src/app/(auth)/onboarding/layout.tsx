import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

export default async function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  if ((await auth()).sessionClaims?.metadata.onboardingComplete === true) {
    redirect("/");
  }

  return <>{children}</>;
}
