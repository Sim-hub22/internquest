import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { RecruiterInternshipDetailPage } from "./recruiter-internship-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = (await getToken({ template: "convex" })) ?? undefined;

  const preloadedInternship = await preloadQuery(
    api.internships.getForRecruiter,
    { internshipId: id as Id<"internships"> },
    { token }
  );

  return (
    <RecruiterInternshipDetailPage preloadedInternship={preloadedInternship} />
  );
}
