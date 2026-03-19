export const BLOG_CATEGORIES = [
  "career_tips",
  "interview_prep",
  "industry_insights",
  "resume_guide",
  "general",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  career_tips: "Career Tips",
  interview_prep: "Interview Prep",
  industry_insights: "Industry Insights",
  resume_guide: "Resume Guide",
  general: "General",
};

export function toBlogCategoryLabel(category: BlogCategory) {
  return BLOG_CATEGORY_LABELS[category];
}

export function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().replace(/\s+/g, " "))
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.toLowerCase())
    )
  );
}

export function slugifyPostTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulRichText(html: string) {
  return stripHtmlToText(html).length > 0;
}
