"use client";

import type { Route } from "next";
import Link from "next/link";
import { type RefObject, useEffect, useRef, useState } from "react";

import type { Preloaded } from "convex/react";
import {
  useMutation,
  usePaginatedQuery,
  usePreloadedQuery,
  useQuery,
} from "convex/react";
import {
  CalendarClockIcon,
  CircleAlertIcon,
  EyeIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ApplicationResumePicker } from "@/components/internships/application-resume-picker";
import {
  InternshipMeta,
  toDisplayLabel,
} from "@/components/internships/constants";
import { canRecruiterManageInternship } from "@/components/internships/manage-listing-access";
import { PdfUploadField } from "@/components/pdf-upload-field";
import { ReportContentButton } from "@/components/report-content-button";
import { RichTextContent } from "@/components/rich-text-content";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { uploadFileToConvexStorage } from "@/lib/convex-file-upload";
import { getPdfValidationMessage } from "@/lib/pdf-files";
import { CANDIDATE_RESUMES_PAGE_SIZE } from "@/lib/resume-library";

type InternshipDetailPageProps = {
  preloadedInternship: Preloaded<typeof api.internships.getPublic>;
};

const ANONYMOUS_VIEWER_STORAGE_KEY = "internquest-anonymous-viewer-key";

const DEADLINE_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
});

export function InternshipDetailPage({
  preloadedInternship,
}: InternshipDetailPageProps) {
  const [anonymousViewerKey, setAnonymousViewerKey] = useState<string | null>(
    null
  );
  const [resumeSelectionMode, setResumeSelectionMode] = useState<
    "saved" | "upload" | null
  >(null);
  const [selectedCandidateResumeId, setSelectedCandidateResumeId] =
    useState<Id<"candidateResumes"> | null>(null);
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const trackedViewKeyRef = useRef<string | null>(null);
  const newResumeInputRef = useRef<HTMLInputElement | null>(null);
  const coverLetterInputRef = useRef<HTMLInputElement | null>(null);
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
  const savedResumesEnabled =
    currentUser &&
    currentUser.role === "candidate" &&
    currentUser.isSuspended !== true;
  const {
    results: savedResumes,
    status: savedResumesStatus,
    loadMore: loadMoreSavedResumes,
  } = usePaginatedQuery(
    api.candidateResumes.listForCurrentUser,
    savedResumesEnabled ? {} : "skip",
    { initialNumItems: CANDIDATE_RESUMES_PAGE_SIZE }
  );
  const trackView = useMutation(api.internships.trackView);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createCandidateResume = useMutation(api.candidateResumes.create);
  const applyToInternship = useMutation(api.applications.apply);
  const formattedDeadline = DEADLINE_DATE_FORMATTER.format(
    internship ? new Date(internship.applicationDeadline) : new Date(0)
  );
  const canApply =
    internship !== null &&
    internship !== undefined &&
    internship.status === "open" &&
    internship.applicationDeadline > Date.now();
  const canManageListing = canRecruiterManageInternship(
    currentUser,
    internship
  );
  const showReportButton = currentUser !== undefined && !canManageListing;
  const selectedSavedResume =
    savedResumes?.find((resume) => resume._id === selectedCandidateResumeId) ??
    null;

  const resetFileInput = (inputRef: RefObject<HTMLInputElement | null>) => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

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
    const coverLetterValidationMessage = getPdfValidationMessage(
      coverLetterFile,
      "Cover letter"
    );

    if (coverLetterValidationMessage) {
      toast.error(coverLetterValidationMessage);
      return;
    }

    setIsApplying(true);

    try {
      let resumeStorageId: Id<"_storage">;
      let candidateResumeId: Id<"candidateResumes"> | undefined;

      if (resumeSelectionMode === "saved") {
        if (!selectedSavedResume) {
          toast.error("Please choose a saved resume");
          return;
        }

        resumeStorageId = selectedSavedResume.storageId;
        candidateResumeId = selectedSavedResume._id;
      } else {
        const resumeValidationMessage = getPdfValidationMessage(
          newResumeFile,
          "Resume",
          true
        );

        if (resumeValidationMessage) {
          toast.error(resumeValidationMessage);
          return;
        }

        const uploadedResumeStorageId = await uploadFileToConvexStorage(
          newResumeFile!,
          generateUploadUrl
        );
        const createdResume = await createCandidateResume({
          storageId: uploadedResumeStorageId,
          originalFilename: newResumeFile!.name,
        });

        resumeStorageId = createdResume.storageId;
        candidateResumeId = createdResume.candidateResumeId;
        setSelectedCandidateResumeId(createdResume.candidateResumeId);
        setResumeSelectionMode("saved");
        setNewResumeFile(null);
        resetFileInput(newResumeInputRef);
      }

      const coverLetterStorageId = coverLetterFile
        ? await uploadFileToConvexStorage(coverLetterFile, generateUploadUrl)
        : undefined;

      await applyToInternship({
        internshipId: internship._id,
        resumeStorageId,
        candidateResumeId,
        coverLetterStorageId,
      });

      toast.success("Application submitted");
      setSelectedCandidateResumeId(null);
      setResumeSelectionMode(null);
      setNewResumeFile(null);
      setCoverLetterFile(null);
      resetFileInput(newResumeInputRef);
      resetFileInput(coverLetterInputRef);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to submit application"
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={"/" as Route}>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={"/internships" as Route}>Internships</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="block max-w-48 truncate sm:max-w-80 lg:max-w-full">
                {internship.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
          stipend={internship.stipend}
        />
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Apply by {formattedDeadline}
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
        {showReportButton ? (
          <ReportContentButton
            targetId={internship._id}
            targetType="internship"
          />
        ) : null}
        {currentUser === undefined ? (
          <Skeleton className="h-9 w-36" />
        ) : currentUser === null ? (
          <Button asChild>
            <Link href={"/sign-up" as Route}>Sign up to apply</Link>
          </Button>
        ) : currentUser.role === "candidate" ? (
          <Card className="w-full border border-primary/15 bg-linear-to-br from-card via-card to-primary/5 shadow-[0_20px_56px_-44px_rgba(37,99,235,0.65)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileTextIcon className="size-5 text-primary" />
                Apply now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  <div className="space-y-4">
                    <ApplicationResumePicker
                      savedResumes={savedResumes}
                      savedResumesStatus={savedResumesStatus}
                      mode={resumeSelectionMode}
                      selectedCandidateResumeId={selectedCandidateResumeId}
                      newResumeFile={newResumeFile}
                      newResumeInputRef={newResumeInputRef}
                      disabled={isApplying}
                      onLoadMoreSavedResumes={() =>
                        loadMoreSavedResumes(CANDIDATE_RESUMES_PAGE_SIZE)
                      }
                      onSelectSavedResume={(candidateResumeId) => {
                        setResumeSelectionMode("saved");
                        setSelectedCandidateResumeId(candidateResumeId);
                        setNewResumeFile(null);
                        resetFileInput(newResumeInputRef);
                      }}
                      onNewResumeChange={(file) => {
                        setResumeSelectionMode(file ? "upload" : null);
                        setSelectedCandidateResumeId(null);
                        setNewResumeFile(file);
                      }}
                      onClearNewResume={() => {
                        setResumeSelectionMode(null);
                        setNewResumeFile(null);
                        resetFileInput(newResumeInputRef);
                      }}
                    />

                    <PdfUploadField
                      id="cover-letter"
                      label="Cover letter"
                      buttonLabel="Upload cover letter"
                      file={coverLetterFile}
                      inputRef={coverLetterInputRef}
                      disabled={isApplying}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setCoverLetterFile(file);
                      }}
                      onRemove={() => {
                        setCoverLetterFile(null);
                        resetFileInput(coverLetterInputRef);
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={handleApply}
                      disabled={
                        isApplying ||
                        (resumeSelectionMode === "saved"
                          ? !selectedCandidateResumeId
                          : !newResumeFile)
                      }
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
          canManageListing ? (
            <Button asChild variant="outline">
              <Link href={`/recruiter/internships/${internship._id}` as Route}>
                Manage Listing
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={"/recruiter/internships" as Route}>
                View Your Listings
              </Link>
            </Button>
          )
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
