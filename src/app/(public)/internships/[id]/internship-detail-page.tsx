"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  type ChangeEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery, useQuery } from "convex/react";
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  FileTextIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  InternshipMeta,
  toDisplayLabel,
} from "@/components/internships/constants";
import { canRecruiterManageInternship } from "@/components/internships/manage-listing-access";
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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type InternshipDetailPageProps = {
  preloadedInternship: Preloaded<typeof api.internships.getPublic>;
};

type PdfUploadFieldProps = {
  id: string;
  label: string;
  buttonLabel: string;
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  required?: boolean;
};

const ANONYMOUS_VIEWER_STORAGE_KEY = "internquest-anonymous-viewer-key";
const MAX_APPLICATION_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const DEADLINE_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
});

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPdfValidationMessage(
  file: File | null,
  label: string,
  required = false
) {
  if (!file) {
    return required ? `Please upload your ${label.toLowerCase()} (PDF)` : null;
  }

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const isPdf = fileType.includes("pdf") || fileName.endsWith(".pdf");

  if (!isPdf) {
    return `${label} must be a PDF file`;
  }

  if (file.size > MAX_APPLICATION_FILE_SIZE_BYTES) {
    return `${label} must be 5MB or smaller`;
  }

  return null;
}

function PdfUploadField({
  id,
  label,
  buttonLabel,
  file,
  inputRef,
  onChange,
  onRemove,
  required = false,
}: PdfUploadFieldProps) {
  return (
    <Field className="gap-1.5 rounded-xl border border-border/70 bg-background/70 px-3 py-2 shadow-sm">
      <FieldLabel
        className="w-full items-center justify-between text-sm font-semibold"
        htmlFor={id}
      >
        <span>{label}</span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-[0.18em] uppercase",
            required
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          {required ? "Required" : "Optional"}
        </span>
      </FieldLabel>
      <FieldContent className="gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={onChange}
        />
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl border border-dashed px-3 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between",
            file
              ? "border-primary/35 bg-primary/5"
              : "border-border/80 bg-muted/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl border",
                file
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              {file ? (
                <CheckCircle2Icon className="size-4" />
              ) : (
                <UploadIcon className="size-4" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm leading-tight font-medium text-foreground">
                {file ? file.name : "No file selected yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {file
                  ? `${formatFileSize(file.size)} • Ready to upload`
                  : "PDF only, up to 5MB."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant={file ? "secondary" : "outline"}
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon className="size-3.5" />
              {file ? "Replace file" : buttonLabel}
            </Button>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
              >
                <XIcon className="size-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </FieldContent>
    </Field>
  );
}

export function InternshipDetailPage({
  preloadedInternship,
}: InternshipDetailPageProps) {
  const [anonymousViewerKey, setAnonymousViewerKey] = useState<string | null>(
    null
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const trackedViewKeyRef = useRef<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
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
  const trackView = useMutation(api.internships.trackView);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
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
    const resumeValidationMessage = getPdfValidationMessage(
      resumeFile,
      "Resume",
      true
    );

    if (resumeValidationMessage) {
      toast.error(resumeValidationMessage);
      return;
    }

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
      const uploadPdf = async (file: File, label: string) => {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/pdf",
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`${label} upload failed`);
        }

        const uploadData = (await uploadResponse.json()) as {
          storageId?: string;
        };

        if (!uploadData.storageId) {
          throw new Error("Upload response missing storageId");
        }

        return uploadData.storageId as Id<"_storage">;
      };

      const resumeStorageId = await uploadPdf(resumeFile!, "Resume");
      const coverLetterStorageId = coverLetterFile
        ? await uploadPdf(coverLetterFile, "Cover letter")
        : undefined;

      await applyToInternship({
        internshipId: internship._id,
        resumeStorageId,
        coverLetterStorageId,
      });

      toast.success("Application submitted");
      setResumeFile(null);
      setCoverLetterFile(null);
      resetFileInput(resumeInputRef);
      resetFileInput(coverLetterInputRef);
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
                  <div className="space-y-2.5">
                    <PdfUploadField
                      id="resume"
                      label="Resume"
                      buttonLabel="Upload resume"
                      file={resumeFile}
                      inputRef={resumeInputRef}
                      required
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setResumeFile(file);
                      }}
                      onRemove={() => {
                        setResumeFile(null);
                        resetFileInput(resumeInputRef);
                      }}
                    />

                    <PdfUploadField
                      id="cover-letter"
                      label="Cover letter"
                      buttonLabel="Upload cover letter"
                      file={coverLetterFile}
                      inputRef={coverLetterInputRef}
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
