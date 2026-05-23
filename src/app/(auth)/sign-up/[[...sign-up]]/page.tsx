import { Metadata } from "next";

import { CustomSignUpForm } from "@/components/auth/custom-sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create an account to get started with the InternQuest platform.",
};

export default function SignUpPage() {
  return <CustomSignUpForm />;
}
