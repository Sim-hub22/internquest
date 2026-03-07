import type { Metadata } from "next";

import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";

import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account to access the InternQuest platform.",
};

export default function SignInPage() {
  return (
    <>
      <ClerkLoading>
        <div className="bg-muted flex min-h-screen w-full flex-1 items-center justify-center p-6 md:p-10">
          <Spinner className="text-primary size-10" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div className="bg-muted flex min-h-screen w-full flex-1 items-center justify-center p-6 md:p-10">
          <SignIn />
        </div>
      </ClerkLoaded>
    </>
  );
}
