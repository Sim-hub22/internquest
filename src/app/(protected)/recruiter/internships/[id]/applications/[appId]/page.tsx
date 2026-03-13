"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type ApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "quiz_assigned"
  | "quiz_completed"
  | "accepted"
  | "rejected";

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["under_review", "rejected"],
  under_review: ["shortlisted", "accepted", "rejected"],
  shortlisted: ["quiz_assigned", "accepted", "rejected"],
  quiz_assigned: ["quiz_completed", "rejected"],
  quiz_completed: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

function formatStatus(status: ApplicationStatus) {
  return status.replaceAll("_", " ");
}

export default function RecruiterApplicationReviewPage() {
  const params = useParams<{ id: string; appId: string }>();
  const internshipId = params.id as Id<"internships">;
  const applicationId = params.appId as Id<"applications">;

  const detail = useQuery(api.applications.getRecruiterDetail, {
    applicationId,
  });
  const updateStatus = useMutation(api.applications.updateStatus);
  const [isSaving, setIsSaving] = useState(false);

  if (detail === undefined) {
    return <div className="p-6">Loading application details...</div>;
  }

  if (!detail) {
    return <div className="p-6">Application not found.</div>;
  }

  const currentStatus = detail.application.status as ApplicationStatus;
  const nextStatuses = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  const handleStatusUpdate = async (nextStatus: ApplicationStatus) => {
    try {
      setIsSaving(true);
      await updateStatus({
        applicationId,
        status: nextStatus,
      });
      toast.success(`Application moved to ${formatStatus(nextStatus)}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update status.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Application review</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {detail.internship.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {detail.internship.company}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{detail.candidate?.name ?? "Candidate"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-sm text-muted-foreground">
              {detail.candidate?.email ?? "No email"}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Cover letter</p>
              <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                {detail.application.coverLetter || "No cover letter provided."}
              </div>
            </div>

            {detail.candidateProfile ? (
              <>
                <Separator />
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold">
                    Candidate profile snapshot
                  </h2>
                  <div>
                    <p className="mb-1 text-sm font-medium">Headline</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {detail.candidateProfile.headline ||
                        "No headline provided."}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.candidateProfile.skills.length > 0 ? (
                        detail.candidateProfile.skills.map((skill) => (
                          <Badge key={skill.name} variant="secondary">
                            {skill.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No skills listed.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current status</p>
              <Badge variant="outline">{formatStatus(currentStatus)}</Badge>
            </div>

            {detail.resumeUrl ? (
              <Button asChild className="w-full" variant="outline">
                <a href={detail.resumeUrl} rel="noreferrer" target="_blank">
                  Open resume
                </a>
              </Button>
            ) : null}

            <Separator />

            <div className="space-y-2">
              {nextStatuses.length > 0 ? (
                nextStatuses.map((nextStatus) => (
                  <Button
                    className="w-full justify-start"
                    disabled={isSaving}
                    key={nextStatus}
                    onClick={() => handleStatusUpdate(nextStatus)}
                    variant="secondary"
                  >
                    Move to {formatStatus(nextStatus)}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No further status transitions available.
                </p>
              )}
            </div>

            <Button asChild className="w-full" variant="ghost">
              <Link
                href={`/recruiter/internships/${internshipId}/applications`}
              >
                Back to all applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
