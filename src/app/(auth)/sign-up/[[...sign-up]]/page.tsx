import { Metadata } from "next";

import { SignUp } from "@clerk/nextjs";

import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create an account to get started with the InternQuest platform.",
};

export default function SignUpPage() {
  return <SignUp fallback={<Spinner className="size-10 text-primary" />} />;
}
