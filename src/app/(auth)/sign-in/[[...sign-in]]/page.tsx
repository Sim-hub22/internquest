import type { Metadata } from "next";

import { SignIn } from "@clerk/nextjs";

import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account to access the InternQuest platform.",
};

export default function SignInPage() {
  return <SignIn fallback={<Spinner className="size-10 text-primary" />} />;
}
