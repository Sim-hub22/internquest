import { preloadQuery } from "convex/nextjs";

import { InternshipsBrowse } from "@/components/internships/internships-browse";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 9;

function getSingleSearchParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicInternshipsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | string[];
    category?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialSearch = getSingleSearchParam(
    resolvedSearchParams.query
  )?.trim();
  const categoryParam = getSingleSearchParam(resolvedSearchParams.category);
  const initialCategory = categoryParam?.trim() || "all";

  const preloadedListResults = await preloadQuery(api.internships.listPublic, {
    sortBy: "newest",
    paginationOpts: { numItems: PAGE_SIZE, cursor: null },
  });

  return (
    <InternshipsBrowse
      key={`${initialCategory}:${initialSearch ?? ""}`}
      preloadedListResults={preloadedListResults}
      initialSearch={initialSearch ?? ""}
      initialCategory={initialCategory}
    />
  );
}
