"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery } from "convex/react";
import { ChevronDownIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { InternshipAnalyticsSection } from "@/components/analytics/internship-analytics-section";
import {
  InternshipMeta,
  InternshipStatusBadge,
  toDisplayLabel,
} from "@/components/internships/constants";
import { RichTextContent } from "@/components/rich-text-content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";

const STATUS_FLOW: Record<
  "draft" | "open" | "closed",
  ("draft" | "open" | "closed")[]
> = {
  draft: ["open", "closed"],
  open: ["closed", "draft"],
  closed: ["open", "draft"],
};

type RecruiterInternshipDetailPageProps = {
  preloadedInternship: Preloaded<typeof api.internships.getForRecruiter>;
};

export function RecruiterInternshipDetailPage({
  preloadedInternship,
}: RecruiterInternshipDetailPageProps) {
  const router = useRouter();
  const destination = "/recruiter/internships" as Route;
  const internship = usePreloadedQuery(preloadedInternship);
  const updateStatus = useMutation(api.internships.updateStatus);
  const removeInternship = useMutation(api.internships.remove);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const onStatusChange = async (status: "draft" | "open" | "closed") => {
    if (!internship) return;

    try {
      await updateStatus({ internshipId: internship._id, status });
      toast.success(`Listing moved to ${toDisplayLabel(status)}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update listing status");
    }
  };

  const onDelete = () => {
    if (!internship) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        await removeInternship({ internshipId: internship._id });
        toast.success("Listing deleted");
        setIsDeleteDialogOpen(false);
        router.push(destination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete listing";
        toast.error(message);
      }
    });
  };

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
        <Button asChild variant="secondary">
          <Link
            href={
              `/recruiter/internships/${internship._id}/applications` as Route
            }
          >
            View Applications
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isUpdatingStatus || isDeleting}>
              Actions
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              {STATUS_FLOW[internship.status].map((status) => (
                <DropdownMenuItem
                  key={`${internship._id}-${status}`}
                  disabled={isUpdatingStatus || isDeleting}
                  onSelect={() => {
                    startStatusTransition(() => {
                      void onStatusChange(status);
                    });
                  }}
                >
                  Move to {toDisplayLabel(status)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {internship.canDelete ? (
              <DropdownMenuItem
                disabled={isUpdatingStatus || isDeleting}
                onSelect={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
              >
                <Trash2Icon />
                Delete listing
              </DropdownMenuItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled variant="destructive">
                      <Trash2Icon />
                      Delete listing
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {internship.deleteDisabledReason}
                </TooltipContent>
              </Tooltip>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      <InternshipAnalyticsSection internshipId={internship._id} />

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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {`"${internship.title}"`}, along with its
              view history and moderation reports. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={onDelete}
              variant="destructive"
            >
              Delete listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
