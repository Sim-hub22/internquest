import { preloadQuery } from "convex/nextjs";

import { InternshipsBrowse } from "@/components/internships/internships-browse";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 9;

export default async function PublicInternshipsPage() {
  const preloadedListResults = await preloadQuery(api.internships.listPublic, {
    sortBy: "newest",
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
  });

  return <InternshipsBrowse preloadedListResults={preloadedListResults} />;
}
