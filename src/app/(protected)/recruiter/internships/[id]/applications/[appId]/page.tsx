"use client";

import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  shortlisted: ["accepted", "rejected"],
  quiz_assigned: ["rejected"],
  quiz_completed: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

function formatStatus(status: ApplicationStatus) {
  return status.replaceAll("_", " ");
}

function formatAttemptStatus(status: "in_progress" | "submitted" | "graded") {
  return status.replaceAll("_", " ");
}

export default function RecruiterApplicationReviewPage() {
  const params = useParams<{ id: string; appId: string }>();
  const internshipId = params.id as Id<"internships">;
  const applicationId = params.appId as Id<"applications">;
  const currentUser = useQuery(api.users.current, {});

  if (currentUser === undefined) {
    return <div className="p-6">Loading application details...</div>;
  }

  if (currentUser === null) {
    return <div className="p-6">Please sign in to review applications.</div>;
  }

  if (currentUser.role !== "recruiter") {
    return <div className="p-6">You do not have access to this page.</div>;
  }

  return (
    <RecruiterApplicationReviewContent
      applicationId={applicationId}
      internshipId={internshipId}
    />
  );
}

function RecruiterApplicationReviewContent({
  applicationId,
  internshipId,
}: {
  applicationId: Id<"applications">;
  internshipId: Id<"internships">;
}) {
  const detail = useQuery(api.applications.getRecruiterDetail, {
    applicationId,
  });
  const availableQuizzes = useQuery(api.quizzes.listForRecruiter, {
    publishedOnly: true,
  });
  const updateStatus = useMutation(api.applications.updateStatus);
  const assignQuiz = useMutation(api.quizzes.assignToApplication);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");

  useEffect(() => {
    if (!availableQuizzes?.length || selectedQuizId) {
      return;
    }

    setSelectedQuizId(availableQuizzes[0]!._id);
  }, [availableQuizzes, selectedQuizId]);

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

  const handleAssignQuiz = async () => {
    if (!selectedQuizId) {
      toast.error("Select a quiz to assign");
      return;
    }

    try {
      setIsSaving(true);
      await assignQuiz({
        applicationId,
        quizId: selectedQuizId as Id<"quizzes">,
      });
      toast.success("Quiz assigned successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign quiz.";
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
                    <p className="mb-1 text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {detail.candidateProfile.location ||
                        "No location provided."}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Education</p>
                    {detail.candidateProfile.education.length > 0 ? (
                      <div className="space-y-2">
                        {detail.candidateProfile.education.map(
                          (entry, index) => (
                            <div
                              className="rounded-md border px-3 py-2 text-sm"
                              key={`${entry.institution}-${entry.degree}-${index}`}
                            >
                              <p className="font-medium">{entry.institution}</p>
                              <p className="text-muted-foreground">
                                {entry.degree} • Graduates{" "}
                                {entry.graduationYear}
                                {entry.gpa !== undefined
                                  ? ` • GPA ${entry.gpa}`
                                  : ""}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No education entries listed.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.candidateProfile.skills.length > 0 ? (
                        detail.candidateProfile.skills.map((skill) => (
                          <Badge key={skill.name} variant="secondary">
                            {skill.name} ({skill.proficiency})
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No skills listed.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Experience</p>
                    {detail.candidateProfile.experience.length > 0 ? (
                      <div className="space-y-2">
                        {detail.candidateProfile.experience.map(
                          (entry, index) => (
                            <div
                              className="rounded-md border px-3 py-2 text-sm"
                              key={`${entry.company}-${entry.title}-${index}`}
                            >
                              <p className="font-medium">
                                {entry.title} • {entry.company}
                              </p>
                              <p className="text-muted-foreground">
                                {entry.startDate} - {entry.endDate || "Present"}
                              </p>
                              {entry.description ? (
                                <p className="mt-1 text-muted-foreground">
                                  {entry.description}
                                </p>
                              ) : null}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No experience entries listed.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Links</p>
                    <div className="space-y-1 text-sm">
                      {detail.candidateProfile.links.github ? (
                        <a
                          className="block text-primary underline-offset-2 hover:underline"
                          href={detail.candidateProfile.links.github}
                          rel="noreferrer"
                          target="_blank"
                        >
                          GitHub
                        </a>
                      ) : null}
                      {detail.candidateProfile.links.linkedin ? (
                        <a
                          className="block text-primary underline-offset-2 hover:underline"
                          href={detail.candidateProfile.links.linkedin}
                          rel="noreferrer"
                          target="_blank"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                      {detail.candidateProfile.links.portfolio ? (
                        <a
                          className="block text-primary underline-offset-2 hover:underline"
                          href={detail.candidateProfile.links.portfolio}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Portfolio
                        </a>
                      ) : null}
                      {!detail.candidateProfile.links.github &&
                      !detail.candidateProfile.links.linkedin &&
                      !detail.candidateProfile.links.portfolio ? (
                        <p className="text-muted-foreground">
                          No links provided.
                        </p>
                      ) : null}
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

            {detail.application.status === "shortlisted" &&
            !detail.assignedQuiz &&
            availableQuizzes &&
            availableQuizzes.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assign quiz</p>
                  <Select
                    value={selectedQuizId}
                    onValueChange={(value) => setSelectedQuizId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a published quiz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {availableQuizzes.map((quiz) => (
                          <SelectItem key={quiz._id} value={quiz._id}>
                            {quiz.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={isSaving}
                  onClick={handleAssignQuiz}
                >
                  Assign Selected Quiz
                </Button>
              </div>
            ) : null}

            {detail.assignedQuiz ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">{detail.assignedQuiz.title}</p>
                <p className="text-muted-foreground">
                  {detail.assignedQuiz.questionCount} questions
                  {detail.assignedQuiz.timeLimit
                    ? ` · ${detail.assignedQuiz.timeLimit} min`
                    : ""}
                </p>
                {detail.quizAttempt ? (
                  <p className="mt-2 text-muted-foreground">
                    Attempt status:{" "}
                    <Link
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      href={
                        `/recruiter/quizzes/${detail.assignedQuiz._id}/results?attemptId=${detail.quizAttempt._id}` as Route
                      }
                    >
                      {formatAttemptStatus(detail.quizAttempt.status)}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

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
