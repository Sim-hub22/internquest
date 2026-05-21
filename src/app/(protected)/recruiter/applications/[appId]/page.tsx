import type { Route } from "next";
import { redirect } from "next/navigation";

import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getAuthToken } from "@/lib/auth";

function isRecoverableLookupError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("ArgumentValidationError") ||
      error.message.includes("Application not found"))
  );
}

export default async function RecruiterApplicationRedirectPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const token = await getAuthToken();

  let detail;

  try {
    detail = await fetchQuery(
      api.applications.getRecruiterDetail,
      { applicationId: appId as Id<"applications"> },
      { token }
    );
  } catch (error) {
    if (isRecoverableLookupError(error)) {
      redirect("/recruiter/applications" as Route);
    }

    throw error;
  }

  if (!detail) {
    redirect("/recruiter/applications" as Route);
  }

  redirect(
    `/recruiter/internships/${detail.internship._id}/applications/${detail.application._id}` as Route
  );
}
