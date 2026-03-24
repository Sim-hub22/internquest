"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery, useQuery } from "convex/react";
import { CalendarClockIcon, CircleAlertIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";

import {
  InternshipMeta,
  toDisplayLabel,
} from "@/components/internships/constants";
import { ReportContentButton } from "@/components/report-content-button";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type InternshipDetailPageProps = {
  preloadedInternship: Preloaded<typeof api.internships.getPublic>;
};

const ANONYMOUS_VIEWER_STORAGE_KEY = "internquest-anonymous-viewer-key";

const DEADLINE_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "UTC",
});

export function InternshipDetailPage({
  preloadedInternship,
}: InternshipDetailPageProps) {
  const [anonymousViewerKey, setAnonymousViewerKey] = useState<string | null>(
    null
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const trackedViewKeyRef = useRef<string | null>(null);
  const internship = usePreloadedQuery(preloadedInternship);
  const currentUser = useQuery(api.users.current);
  const existingApplication = useQuery(
    api.applications.getForCandidateByInternship,
    currentUser &&
      currentUser.role === "candidate" &&
      currentUser.isSuspended !== true &&
      internship
      ? { internshipId: internship._id }
      : "skip"
  );
  const trackView = useMutation(api.internships.trackView);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const applyToInternship = useMutation(api.applications.apply);
  const formattedDeadline = DEADLINE_DATE_TIME_FORMATTER.format(
    internship ? new Date(internship.applicationDeadline) : new Date(0)
  );
  const canApply =
    internship !== null &&
    internship !== undefined &&
    internship.status === "open" &&
    internship.applicationDeadline > Date.now();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existingViewerKey = window.localStorage.getItem(
      ANONYMOUS_VIEWER_STORAGE_KEY
    );

    if (existingViewerKey) {
      setAnonymousViewerKey(existingViewerKey);
      return;
    }

    const nextViewerKey =
      window.crypto?.randomUUID?.() ??
      `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(ANONYMOUS_VIEWER_STORAGE_KEY, nextViewerKey);
    setAnonymousViewerKey(nextViewerKey);
  }, []);

  useEffect(() => {
    if (!internship || currentUser === undefined) {
      return;
    }

    const viewerIdentityKey = currentUser
      ? `user:${currentUser._id}`
      : anonymousViewerKey;

    if (!viewerIdentityKey) {
      return;
    }

    const trackedViewKey = `${internship._id}:${viewerIdentityKey}`;
    if (trackedViewKeyRef.current === trackedViewKey) {
      return;
    }

    trackedViewKeyRef.current = trackedViewKey;

    void trackView({
      internshipId: internship._id,
      ...(currentUser ? {} : { viewerKey: anonymousViewerKey ?? undefined }),
    }).catch(() => {
      if (trackedViewKeyRef.current === trackedViewKey) {
        trackedViewKeyRef.current = null;
      }
    });
  }, [anonymousViewerKey, currentUser, internship, trackView]);

  if (!internship) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleAlertIcon className="size-5 text-muted-foreground" />
              Internship unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This internship is no longer open for public viewing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApply = async () => {
    if (!resumeFile) {
      toast.error("Please upload your resume (PDF)");
      return;
    }

    const fileType = resumeFile.type.toLowerCase();
    if (!fileType.includes("pdf")) {
      toast.error("Resume must be a PDF file");
      return;
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      toast.error("Resume must be 5MB or smaller");
      return;
    }

    setIsApplying(true);

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": resumeFile.type || "application/pdf",
        },
        body: resumeFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Resume upload failed");
      }

      const uploadData = (await uploadResponse.json()) as {
        storageId?: string;
      };

      if (!uploadData.storageId) {
        throw new Error("Upload response missing storageId");
      }

      await applyToInternship({
        internshipId: internship._id,
        resumeStorageId: uploadData.storageId as Id<"_storage">,
        coverLetter: coverLetter.trim() || undefined,
      });

      toast.success("Application submitted");
      setCoverLetter("");
      setResumeFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{toDisplayLabel(internship.category)}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <EyeIcon className="size-3.5" />
            {internship.viewCount} views
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {internship.title}
        </h1>
        <InternshipMeta
          company={internship.company}
          locationType={internship.locationType}
          duration={internship.duration}
        />
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Apply by {formattedDeadline} UTC
        </p>
      </div>

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

      <div className="flex flex-wrap items-center gap-2">
        <ReportContentButton
          targetId={internship._id}
          targetType="internship"
        />
        {currentUser === undefined ? (
          <Skeleton className="h-9 w-36" />
        ) : currentUser === null ? (
          <Button asChild>
            <Link href={"/sign-up" as Route}>Sign up to apply</Link>
          </Button>
        ) : currentUser.role === "candidate" ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Apply now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingApplication ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    You already applied to this internship.
                  </p>
                  <Button asChild variant="outline">
                    <Link href={"/candidate/applications" as Route}>
                      View my applications
                    </Link>
                  </Button>
                </>
              ) : !canApply ? (
                <p className="text-sm text-muted-foreground">
                  Applications are currently closed for this internship.
                </p>
              ) : currentUser.isSuspended ? (
                <p className="text-sm text-muted-foreground">
                  Your account is suspended, so applications are currently
                  disabled.
                </p>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="resume">
                      Resume (PDF, max 5MB)
                    </FieldLabel>
                    <input
                      id="resume"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setResumeFile(file);
                      }}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cover-letter">
                      Cover letter (optional)
                    </FieldLabel>
                    <Textarea
                      id="cover-letter"
                      placeholder="Share why you are a strong fit for this role."
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                    />
                  </Field>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleApply}
                      disabled={isApplying || !resumeFile}
                    >
                      {isApplying ? "Submitting..." : "Apply now"}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={"/candidate/dashboard" as Route}>
                        View Candidate Dashboard
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : currentUser.role === "recruiter" ? (
          <Button asChild variant="outline">
            <Link href={`/recruiter/internships/${internship._id}` as Route}>
              Manage Listing
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={"/admin/dashboard" as Route}>
              Go To Admin Dashboard
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
