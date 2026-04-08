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

const STIPEND_FORMATTER = new Intl.NumberFormat("en-NP");

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
          NPR {STIPEND_FORMATTER.format(stipend)} / month
        </span>
      ) : null}
    </div>
  );
}
