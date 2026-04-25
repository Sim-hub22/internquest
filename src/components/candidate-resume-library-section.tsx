"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";

import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PdfUploadField } from "@/components/pdf-upload-field";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { uploadFileToConvexStorage } from "@/lib/convex-file-upload";
import { getPdfValidationMessage } from "@/lib/pdf-files";
import { CANDIDATE_RESUMES_PAGE_SIZE } from "@/lib/resume-library";

type ResumeRecord = {
  _id: Id<"candidateResumes">;
  storageId: Id<"_storage">;
  label: string;
  originalFilename: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  url: string | null;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CandidateResumeLibrarySection() {
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const {
    results: activeResumes,
    status: resumesStatus,
    loadMore: loadMoreResumes,
  } = usePaginatedQuery(
    api.candidateResumes.listForCurrentUser,
    isAuthenticated ? {} : "skip",
    { initialNumItems: CANDIDATE_RESUMES_PAGE_SIZE }
  );
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createResume = useMutation(api.candidateResumes.create);
  const renameResume = useMutation(api.candidateResumes.rename);
  const removeResume = useMutation(api.candidateResumes.remove);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingResumeId, setEditingResumeId] =
    useState<Id<"candidateResumes"> | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [resumePendingRemoval, setResumePendingRemoval] =
    useState<ResumeRecord | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const isLoadingFirstPage = resumesStatus === "LoadingFirstPage";
  const isLoadingMore = resumesStatus === "LoadingMore";
  const canLoadMore = resumesStatus === "CanLoadMore";

  const resetUploadInput = () => {
    setUploadFile(null);
    setUploadLabel("");
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    const validationMessage = getPdfValidationMessage(
      uploadFile,
      "Resume",
      true
    );

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setIsUploading(true);

    try {
      const storageId = await uploadFileToConvexStorage(
        uploadFile!,
        generateUploadUrl
      );

      await createResume({
        storageId,
        originalFilename: uploadFile!.name,
        label: uploadLabel.trim() || undefined,
      });

      toast.success("Resume saved to your library");
      resetUploadInput();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to save resume"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRename = async () => {
    if (!editingResumeId) {
      return;
    }

    const nextLabel = editingLabel.trim();

    if (!nextLabel) {
      toast.error("Resume label is required");
      return;
    }

    setIsRenaming(true);

    try {
      await renameResume({
        candidateResumeId: editingResumeId,
        label: nextLabel,
      });
      toast.success("Resume renamed");
      setEditingResumeId(null);
      setEditingLabel("");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to rename resume"
      );
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRemove = async () => {
    if (!resumePendingRemoval) {
      return;
    }

    setIsRemoving(true);

    try {
      await removeResume({
        candidateResumeId: resumePendingRemoval._id,
      });
      toast.success("Resume removed from your library");
      setResumePendingRemoval(null);
      if (editingResumeId === resumePendingRemoval._id) {
        setEditingResumeId(null);
        setEditingLabel("");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to remove resume"
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Resume Library</CardTitle>
            <CardDescription>
              Save resumes here and choose the right one each time you apply.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={"/candidate/applications" as Route}>
              View applications
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/25 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Upload a new resume</p>
                <p className="text-sm text-muted-foreground">
                  Uploading here makes the resume available in future internship
                  applications.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <PdfUploadField
                id="candidate-resume-library-upload"
                label="Resume PDF"
                buttonLabel="Choose resume"
                file={uploadFile}
                inputRef={resumeInputRef}
                required
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setUploadFile(file);
                }}
                onRemove={resetUploadInput}
              />

              <Field>
                <FieldLabel htmlFor="candidate-resume-library-label">
                  Resume label (optional)
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="candidate-resume-library-label"
                    placeholder="Frontend Resume"
                    value={uploadLabel}
                    disabled={isUploading}
                    onChange={(event) => setUploadLabel(event.target.value)}
                  />
                  <FieldDescription>
                    Leave blank to use the uploaded filename as the label.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={isUploading || !uploadFile}
                  onClick={() => void handleUpload()}
                >
                  <UploadIcon className="size-4" />
                  {isUploading ? "Saving..." : "Save resume"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Saved resumes</p>
              <p className="text-sm text-muted-foreground">
                These resumes can be selected while applying to internships.
              </p>
            </div>

            {isLoadingFirstPage ? (
              <p className="text-sm text-muted-foreground">
                Loading resumes...
              </p>
            ) : activeResumes.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No resumes saved yet. Upload your first PDF above.
              </div>
            ) : (
              <div className="space-y-3">
                {activeResumes.map((resume) => {
                  const isEditing = editingResumeId === resume._id;

                  return (
                    <div
                      key={resume._id}
                      className="rounded-xl border bg-background px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <FileTextIcon className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium">{resume.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {resume.originalFilename}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Added{" "}
                            {DATE_TIME_FORMATTER.format(
                              new Date(resume.createdAt)
                            )}
                            {resume.lastUsedAt
                              ? ` • Last used ${DATE_TIME_FORMATTER.format(
                                  new Date(resume.lastUsedAt)
                                )}`
                              : ""}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {resume.url ? (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={resume.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ExternalLinkIcon className="size-3.5" />
                                Open
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingResumeId(resume._id);
                              setEditingLabel(resume.label);
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setResumePendingRemoval(resume)}
                          >
                            <Trash2Icon className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-4 rounded-xl border bg-muted/25 p-3">
                          <Field>
                            <FieldLabel htmlFor={`rename-resume-${resume._id}`}>
                              Resume label
                            </FieldLabel>
                            <FieldContent>
                              <Input
                                id={`rename-resume-${resume._id}`}
                                value={editingLabel}
                                disabled={isRenaming}
                                onChange={(event) =>
                                  setEditingLabel(event.target.value)
                                }
                              />
                            </FieldContent>
                          </Field>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isRenaming}
                              onClick={() => void handleRename()}
                            >
                              {isRenaming ? "Saving..." : "Save label"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isRenaming}
                              onClick={() => {
                                setEditingResumeId(null);
                                setEditingLabel("");
                              }}
                            >
                              <XIcon className="size-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {canLoadMore || isLoadingMore ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoadingMore}
                      onClick={() =>
                        loadMoreResumes(CANDIDATE_RESUMES_PAGE_SIZE)
                      }
                    >
                      {isLoadingMore ? "Loading more..." : "Load more resumes"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={resumePendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !isRemoving) {
            setResumePendingRemoval(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the resume from your active library. Past
              applications will still keep their existing resume snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              variant="destructive"
              onClick={() => void handleRemove()}
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
