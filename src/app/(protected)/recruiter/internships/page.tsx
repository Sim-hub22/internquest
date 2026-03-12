import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";

import { RecruiterInternshipsPage } from "./recruiter-internships-page";

const PAGE_SIZE = 9;

export default async function Page() {
  const { getToken } = await auth();
  const token = (await getToken({ template: "convex" })) ?? undefined;

  const preloadedResults = await preloadQuery(
    api.internships.listForRecruiter,
    { paginationOpts: { numItems: PAGE_SIZE, cursor: null } },
    { token }
  );

  return <RecruiterInternshipsPage preloadedResults={preloadedResults} />;
}
