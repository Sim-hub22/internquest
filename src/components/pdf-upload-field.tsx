"use client";

import type { ChangeEvent, RefObject } from "react";

import { CheckCircle2Icon, UploadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { formatFileSize } from "@/lib/pdf-files";
import { cn } from "@/lib/utils";

type PdfUploadFieldProps = {
  id: string;
  label: string;
  buttonLabel: string;
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  required?: boolean;
  disabled?: boolean;
};

function PdfUploadField({
  id,
  label,
  buttonLabel,
  file,
  inputRef,
  onChange,
  onRemove,
  required = false,
  disabled = false,
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
          disabled={disabled}
          onChange={onChange}
        />
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl border border-dashed px-3 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between",
            file
              ? "border-primary/35 bg-primary/5"
              : "border-border/80 bg-muted/30",
            disabled && "opacity-70"
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
                  ? `${formatFileSize(file.size)} - Ready to upload`
                  : "PDF only, up to 5MB."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant={file ? "secondary" : "outline"}
              size="sm"
              disabled={disabled}
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
                disabled={disabled}
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

export { PdfUploadField };
