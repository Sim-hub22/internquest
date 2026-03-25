import { notFound } from "next/navigation";

import { preloadQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getAuthToken } from "@/lib/auth";

import { RecruiterInternshipDetailPage } from "./recruiter-internship-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getAuthToken();

  let preloadedInternship;

  try {
    preloadedInternship = await preloadQuery(
      api.internships.getForRecruiter,
      { internshipId: id as Id<"internships"> },
      { token }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("ArgumentValidationError")
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <RecruiterInternshipDetailPage preloadedInternship={preloadedInternship} />
  );
}
