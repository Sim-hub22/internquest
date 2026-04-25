"use client";

import type { Route } from "next";
import Link from "next/link";
import type { RefObject } from "react";

import { FileTextIcon } from "lucide-react";

import { PdfUploadField } from "@/components/pdf-upload-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type SavedResume = {
  _id: Id<"candidateResumes">;
  storageId: Id<"_storage">;
  label: string;
  originalFilename: string;
  url: string | null;
};

type SavedResumePaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";

type ApplicationResumePickerProps = {
  savedResumes: SavedResume[];
  savedResumesStatus: SavedResumePaginationStatus;
  mode: "saved" | "upload" | null;
  selectedCandidateResumeId: Id<"candidateResumes"> | null;
  newResumeFile: File | null;
  newResumeInputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onLoadMoreSavedResumes: () => void;
  onSelectSavedResume: (candidateResumeId: Id<"candidateResumes">) => void;
  onNewResumeChange: (file: File | null) => void;
  onClearNewResume: () => void;
};

export function ApplicationResumePicker({
  savedResumes,
  savedResumesStatus,
  mode,
  selectedCandidateResumeId,
  newResumeFile,
  newResumeInputRef,
  disabled = false,
  onLoadMoreSavedResumes,
  onSelectSavedResume,
  onNewResumeChange,
  onClearNewResume,
}: ApplicationResumePickerProps) {
  const hasSavedResumes = savedResumes.length > 0;
  const isLoadingFirstPage = savedResumesStatus === "LoadingFirstPage";
  const isLoadingMore = savedResumesStatus === "LoadingMore";
  const canLoadMore = savedResumesStatus === "CanLoadMore";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Resume</p>
          <p className="text-sm text-muted-foreground">
            Choose one saved resume or upload a new PDF from your computer. New
            uploads are saved to your library automatically.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={"/candidate/profile/edit" as Route}>Manage resumes</Link>
        </Button>
      </div>

      {isLoadingFirstPage ? (
        <p className="text-sm text-muted-foreground">
          Loading saved resumes...
        </p>
      ) : hasSavedResumes ? (
        <Field>
          <FieldLabel>Choose from saved resumes</FieldLabel>
          <FieldContent>
            <RadioGroup
              value={mode === "saved" ? (selectedCandidateResumeId ?? "") : ""}
              onValueChange={(value) =>
                onSelectSavedResume(value as Id<"candidateResumes">)
              }
            >
              <div className="space-y-2">
                {savedResumes.map((resume) => {
                  const isSelected =
                    mode === "saved" &&
                    selectedCandidateResumeId === resume._id;

                  return (
                    <label
                      key={resume._id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/35"
                      )}
                    >
                      <RadioGroupItem
                        value={resume._id}
                        disabled={disabled}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="size-4 text-primary" />
                          <p className="truncate text-sm font-medium">
                            {resume.label}
                          </p>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {resume.originalFilename}
                        </p>
                        {resume.url ? (
                          <a
                            href={resume.url}
                            rel="noreferrer"
                            target="_blank"
                            className="inline-flex text-xs text-primary underline-offset-4 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open saved PDF
                          </a>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
            {canLoadMore || isLoadingMore ? (
              <div className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || isLoadingMore}
                  onClick={onLoadMoreSavedResumes}
                >
                  {isLoadingMore ? "Loading more..." : "Load more resumes"}
                </Button>
              </div>
            ) : null}
            <FieldDescription>
              No saved resume is selected by default. Pick one manually if you
              want to use it for this application.
            </FieldDescription>
          </FieldContent>
        </Field>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
          You do not have any saved resumes yet. Upload one below to continue.
        </div>
      )}

      <PdfUploadField
        id="application-resume-upload"
        label="Upload a new resume instead"
        buttonLabel="Upload new resume"
        file={newResumeFile}
        inputRef={newResumeInputRef}
        required={!hasSavedResumes}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onNewResumeChange(file);
        }}
        onRemove={onClearNewResume}
      />
    </div>
  );
}
