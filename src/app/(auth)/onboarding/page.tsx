import { Metadata } from "next";

import { Onboarding } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Welcome to the InternQuest platform! Let's get you set up.",
};

export default function OnboardingPage() {
  return <Onboarding />;
}
