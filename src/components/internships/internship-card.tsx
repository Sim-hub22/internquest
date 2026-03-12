import type { Route } from "next";
import Link from "next/link";

import { EyeIcon } from "lucide-react";

import {
  InternshipMeta,
  InternshipStatusBadge,
  toDisplayLabel,
} from "@/components/internships/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Doc } from "@/convex/_generated/dataModel";

type InternshipCardProps = {
  internship: Doc<"internships">;
  href: string;
  actionLabel?: string;
};

export function InternshipCard({
  internship,
  href,
  actionLabel = "View Details",
}: InternshipCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-lg">
            {internship.title}
          </CardTitle>
          <InternshipStatusBadge status={internship.status} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{toDisplayLabel(internship.category)}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <EyeIcon className="size-3.5" />
            {internship.viewCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <InternshipMeta
          company={internship.company}
          locationType={internship.locationType}
          duration={internship.duration}
        />
        <p className="text-sm text-muted-foreground">
          Apply by{" "}
          {new Date(internship.applicationDeadline).toLocaleDateString()}
        </p>
        <p className="text-sm text-muted-foreground">
          {internship.stipend
            ? `Stipend: $${internship.stipend.toLocaleString()} / month`
            : "Stipend not specified"}
        </p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild className="w-full">
          <Link href={href as Route}>{actionLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
