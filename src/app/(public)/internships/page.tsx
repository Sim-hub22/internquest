import { preloadQuery } from "convex/nextjs";

import { INTERNSHIP_CATEGORIES } from "@/components/internships/constants";
import { InternshipsBrowse } from "@/components/internships/internships-browse";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 9;

type InternshipCategory = (typeof INTERNSHIP_CATEGORIES)[number];

function getSingleSearchParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isInternshipCategory(
  value: string | undefined
): value is InternshipCategory {
  return INTERNSHIP_CATEGORIES.includes(value as InternshipCategory);
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
  const initialCategory = isInternshipCategory(categoryParam)
    ? categoryParam
    : "all";

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
