import { ConvexError } from "convex/values";

import { Doc } from "@/convex/_generated/dataModel";
import { MutationCtx, QueryCtx } from "@/convex/_generated/server";

export const BUILT_IN_INTERNSHIP_CATEGORIES = [
  { slug: "technology", name: "Technology" },
  { slug: "business", name: "Business" },
  { slug: "design", name: "Design" },
  { slug: "marketing", name: "Marketing" },
  { slug: "finance", name: "Finance" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "other", name: "Other" },
] as const;

const BUILT_IN_CATEGORY_BY_SLUG = new Map<string, (typeof BUILT_IN_INTERNSHIP_CATEGORIES)[number]>(
  BUILT_IN_INTERNSHIP_CATEGORIES.map((category) => [category.slug, category])
);

export type InternshipCategoryOption = {
  slug: string;
  name: string;
  status: "approved";
  isBuiltIn: boolean;
};

export function toCategoryName(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function normalizeCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCategorySlugs(
  primaryCategory: string,
  categories: string[] | undefined
) {
  return Array.from(
    new Set(
      [primaryCategory, ...(categories ?? [])]
        .map(normalizeCategorySlug)
        .filter(Boolean)
    )
  );
}

export async function getApprovedCategoryOptions(
  ctx: QueryCtx | MutationCtx
): Promise<InternshipCategoryOption[]> {
  const approvedCustomCategories = await ctx.db
    .query("internshipCategories")
    .withIndex("by_status", (q) => q.eq("status", "approved"))
    .collect();

  const bySlug = new Map<string, InternshipCategoryOption>();

  for (const category of BUILT_IN_INTERNSHIP_CATEGORIES) {
    bySlug.set(category.slug, {
      ...category,
      status: "approved",
      isBuiltIn: true,
    });
  }

  for (const category of approvedCustomCategories) {
    bySlug.set(category.slug, {
      slug: category.slug,
      name: category.name,
      status: "approved",
      isBuiltIn: BUILT_IN_CATEGORY_BY_SLUG.has(category.slug),
    });
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export async function getApprovedCategorySlugSet(
  ctx: QueryCtx | MutationCtx
) {
  const approvedCategories = await getApprovedCategoryOptions(ctx);
  return new Set(approvedCategories.map((category) => category.slug));
}

export async function assertApprovedCategorySlugs(
  ctx: QueryCtx | MutationCtx,
  categorySlugs: string[]
) {
  const approvedSlugs = await getApprovedCategorySlugSet(ctx);
  const invalidSlug = categorySlugs.find((slug) => !approvedSlugs.has(slug));

  if (invalidSlug) {
    throw new ConvexError(
      `"${toCategoryName(invalidSlug)}" is not an approved internship category`
    );
  }
}

export function isBuiltInCategorySlug(slug: string) {
  return BUILT_IN_CATEGORY_BY_SLUG.has(slug);
}

export function buildCategoryOptionFromDoc(
  category: Doc<"internshipCategories">
) {
  return {
    ...category,
    isBuiltIn: isBuiltInCategorySlug(category.slug),
  };
}
