"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  InternshipMeta,
  InternshipStatusBadge,
  toDisplayLabel,
} from "@/components/internships/constants";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const STATUS_FLOW: Record<
  "draft" | "open" | "closed",
  ("draft" | "open" | "closed")[]
> = {
  draft: ["open", "closed"],
  open: ["closed", "draft"],
  closed: ["open", "draft"],
};

export default function RecruiterInternshipDetailPage() {
  const params = useParams<{ id: string }>();
  const internshipId = params.id as Id<"internships">;

  const internship = useQuery(api.internships.getForRecruiter, {
    internshipId,
  });
  const updateStatus = useMutation(api.internships.updateStatus);

  const onStatusChange = async (status: "draft" | "open" | "closed") => {
    try {
      await updateStatus({ internshipId, status });
      toast.success(`Listing moved to ${toDisplayLabel(status)}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update listing status");
    }
  };

  if (internship === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Internship not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This listing may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{toDisplayLabel(internship.category)}</Badge>
          <InternshipStatusBadge status={internship.status} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {internship.title}
        </h1>
        <InternshipMeta
          company={internship.company}
          locationType={internship.locationType}
          duration={internship.duration}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={`/recruiter/internships/${internship._id}/edit` as Route}>
            Edit Listing
          </Link>
        </Button>
        {STATUS_FLOW[internship.status].map((status) => (
          <Button
            key={`${internship._id}-${status}`}
            variant="outline"
            onClick={() => onStatusChange(status)}
          >
            Move to {toDisplayLabel(status)}
          </Button>
        ))}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Role Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RichTextContent html={internship.description} />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Requirements</h2>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {internship.requirements.map((requirement, index) => (
                <li key={`${internship._id}-requirement-${index}`}>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
