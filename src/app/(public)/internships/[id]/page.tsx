import { preloadQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { InternshipDetailPage } from "./internship-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const preloadedInternship = await preloadQuery(api.internships.getPublic, {
    internshipId: id as Id<"internships">,
  });

  return <InternshipDetailPage preloadedInternship={preloadedInternship} />;
}
