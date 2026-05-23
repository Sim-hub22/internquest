import {
  BanknoteIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleXIcon,
  Clock3Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const DEFAULT_INTERNSHIP_CATEGORIES = [
  { slug: "technology", name: "Technology" },
  { slug: "business", name: "Business" },
  { slug: "design", name: "Design" },
  { slug: "marketing", name: "Marketing" },
  { slug: "finance", name: "Finance" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "other", name: "Other" },
] as const;

export const INTERNSHIP_CATEGORIES = DEFAULT_INTERNSHIP_CATEGORIES.map(
  (category) => category.slug
);

export type InternshipCategoryOption = {
  slug: string;
  name: string;
};

export const LOCATION_TYPES = ["remote", "onsite", "hybrid"] as const;

export const INTERNSHIP_STATUSES = ["draft", "open", "closed"] as const;

const STIPEND_FORMATTER = new Intl.NumberFormat("en-NP");

export function formatInternshipStipend(stipend?: number, emptyLabel?: string) {
  if (stipend === undefined) {
    return emptyLabel ?? null;
  }

  return `NPR ${STIPEND_FORMATTER.format(stipend)} / month`;
}

export function toDisplayLabel(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCategoryOptions(
  categories: InternshipCategoryOption[] | undefined
) {
  return categories && categories.length > 0
    ? categories
    : DEFAULT_INTERNSHIP_CATEGORIES;
}

export function getCategoryLabel(
  slug: string,
  categories?: InternshipCategoryOption[]
) {
  return (
    categories?.find((category) => category.slug === slug)?.name ??
    toDisplayLabel(slug)
  );
}

export function getDisplayCategories<
  T extends { category: string; categories?: string[] },
>(internship: T) {
  return Array.from(
    new Set([internship.category, ...(internship.categories ?? [])])
  );
}

export function InternshipStatusBadge({ status }: { status: string }) {
  const variant =
    status === "open"
      ? "default"
      : status === "draft"
        ? "secondary"
        : "destructive";

  const StatusIcon =
    status === "open"
      ? CircleCheckIcon
      : status === "draft"
        ? CircleDotIcon
        : CircleXIcon;

  return (
    <Badge
      variant={variant}
      className={cn(status === "open" && "bg-emerald-500/20 text-emerald-500")}
    >
      <StatusIcon />
      {toDisplayLabel(status)}
    </Badge>
  );
}

export function InternshipMeta({
  company,
  locationType,
  duration,
  stipend,
}: {
  company: string;
  locationType: string;
  duration: string;
  stipend?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Building2Icon className="size-4" />
        {company}
      </span>
      <span className="inline-flex items-center gap-1">
        <BriefcaseBusinessIcon className="size-4" />
        {toDisplayLabel(locationType)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock3Icon className="size-4" />
        {duration}
      </span>
      {stipend !== undefined ? (
        <span className="inline-flex items-center gap-1">
          <BanknoteIcon className="size-4" />
          {formatInternshipStipend(stipend)}
        </span>
      ) : null}
    </div>
  );
}
