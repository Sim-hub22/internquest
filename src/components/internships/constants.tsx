import { BriefcaseBusinessIcon, Building2Icon, Clock3Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const INTERNSHIP_CATEGORIES = [
  "technology",
  "business",
  "design",
  "marketing",
  "finance",
  "healthcare",
  "other",
] as const;

export const LOCATION_TYPES = ["remote", "onsite", "hybrid"] as const;

export const INTERNSHIP_STATUSES = ["draft", "open", "closed"] as const;

export function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function InternshipStatusBadge({ status }: { status: string }) {
  const variant =
    status === "open"
      ? "default"
      : status === "draft"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{toDisplayLabel(status)}</Badge>;
}

export function InternshipMeta({
  company,
  locationType,
  duration,
}: {
  company: string;
  locationType: string;
  duration: string;
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
    </div>
  );
}
