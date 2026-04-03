"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import {
  INTERNSHIP_CATEGORIES,
  INTERNSHIP_STATUSES,
  LOCATION_TYPES,
  toDisplayLabel,
} from "@/components/internships/constants";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type InternshipFormProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      internshipId: Id<"internships">;
    };

const internshipSchema = z.object({
  title: z.string().min(3, "Title should be at least 3 characters"),
  company: z.string().min(2, "Company should be at least 2 characters"),
  description: z
    .string()
    .min(10, "Description should be at least 10 characters"),
  category: z.enum(INTERNSHIP_CATEGORIES),
  location: z.string().min(2, "Location is required"),
  locationType: z.enum(LOCATION_TYPES),
  duration: z.string().min(2, "Duration is required"),
  stipend: z.string().optional(),
  requirementsText: z.string().min(1, "Add at least one requirement"),
  status: z.enum(INTERNSHIP_STATUSES),
  applicationDeadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Deadline cannot be in the past"),
  maxApplications: z.string().optional(),
});

type InternshipFormValues = z.infer<typeof internshipSchema>;

const DEFAULT_VALUES: InternshipFormValues = {
  title: "",
  company: "",
  description: "",
  category: "technology",
  location: "",
  locationType: "remote",
  duration: "",
  stipend: "",
  requirementsText: "",
  status: "draft",
  applicationDeadline: "",
  maxApplications: "",
};

function formatDateLabel(value: string) {
  if (!value) {
    return "Pick a deadline";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Pick a deadline";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function InternshipForm(props: InternshipFormProps) {
  const router = useRouter();
  const destination = "/recruiter/internships" as Route;
  const [submitIntent, setSubmitIntent] = useState<"draft" | "open" | null>(
    null
  );
  const minSelectableDate = new Date();
  minSelectableDate.setHours(0, 0, 0, 0);
  const calendarTimeZone =
    typeof window === "undefined"
      ? undefined
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { isAuthenticated } = useConvexAuth();
  const createInternship = useMutation(api.internships.create);
  const updateInternship = useMutation(api.internships.update);

  const internship = useQuery(
    api.internships.getForRecruiter,
    isAuthenticated && props.mode === "edit"
      ? { internshipId: props.internshipId }
      : "skip"
  );

  const form = useForm<InternshipFormValues>({
    resolver: zodResolver(internshipSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!internship || props.mode !== "edit") {
      return;
    }

    form.reset({
      title: internship.title,
      company: internship.company,
      description: internship.description,
      category: internship.category,
      location: internship.location,
      locationType: internship.locationType,
      duration: internship.duration,
      stipend: internship.stipend ? String(internship.stipend) : "",
      requirementsText: internship.requirements.join("\n"),
      status: internship.status,
      applicationDeadline: new Date(internship.applicationDeadline)
        .toISOString()
        .slice(0, 10),
      maxApplications: internship.maxApplications
        ? String(internship.maxApplications)
        : "",
    });
  }, [form, internship, props.mode]);

  const submit = async (
    values: InternshipFormValues,
    status: "draft" | "open"
  ) => {
    const deadlineTimestamp = new Date(values.applicationDeadline).getTime();
    const stipend = values.stipend ? Number(values.stipend) : undefined;
    const maxApplications = values.maxApplications
      ? Number(values.maxApplications)
      : undefined;
    const requirements = values.requirementsText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    if (requirements.length === 0) {
      toast.error("Add at least one requirement");
      return;
    }

    try {
      if (props.mode === "create") {
        await createInternship({
          title: values.title,
          company: values.company,
          description: values.description,
          category: values.category,
          location: values.location,
          locationType: values.locationType,
          duration: values.duration,
          stipend,
          requirements,
          status,
          applicationDeadline: deadlineTimestamp,
          maxApplications,
        });
        toast.success(
          `Internship ${status === "open" ? "published" : "saved as draft"}`
        );
      } else {
        await updateInternship({
          internshipId: props.internshipId,
          title: values.title,
          company: values.company,
          description: values.description,
          category: values.category,
          location: values.location,
          locationType: values.locationType,
          duration: values.duration,
          stipend,
          requirements,
          status,
          applicationDeadline: deadlineTimestamp,
          maxApplications,
        });
        toast.success("Internship updated");
      }

      router.push(destination);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save internship");
    } finally {
      setSubmitIntent(null);
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const isSubmittingDraft = isSubmitting && submitIntent === "draft";
  const isSubmittingPublish = isSubmitting && submitIntent === "open";

  return (
    <div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">
          {props.mode === "create" ? "Create Internship" : "Edit Internship"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below. Save as draft or publish when ready.
        </p>
      </div>

      <form
        className="grid gap-8"
        onSubmit={form.handleSubmit((values) => {
          setSubmitIntent("draft");
          return submit(values, "draft");
        })}
      >
        <section className="grid gap-4">
          <p className="text-sm font-medium text-foreground">Role basics</p>
          <FieldSet className="grid gap-4 md:grid-cols-2">
            <FieldLegend className="sr-only">Role Basics</FieldLegend>

            <Field
              className="md:col-span-2"
              data-invalid={!!form.formState.errors.title}
            >
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                placeholder="e.g. Product Design Intern"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.company}>
              <FieldLabel htmlFor="company">Company</FieldLabel>
              <Input
                id="company"
                placeholder="Company or studio name"
                aria-invalid={!!form.formState.errors.company}
                {...form.register("company")}
              />
              <FieldError errors={[form.formState.errors.company]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.location}>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                placeholder="Kathmandu, Nepal"
                aria-invalid={!!form.formState.errors.location}
                {...form.register("location")}
              />
              <FieldError errors={[form.formState.errors.location]} />
            </Field>
          </FieldSet>
        </section>

        <Separator />

        <section className="grid gap-4">
          <p className="text-sm font-medium text-foreground">
            Classification &amp; logistics
          </p>
          <FieldSet
            className={
              props.mode === "edit"
                ? "grid gap-4 md:grid-cols-3"
                : "grid gap-4 md:grid-cols-2"
            }
          >
            <FieldLegend className="sr-only">Classification</FieldLegend>

            <Field data-invalid={!!form.formState.errors.category}>
              <FieldLabel>Category</FieldLabel>
              <FieldContent>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={!!form.formState.errors.category}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {INTERNSHIP_CATEGORIES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {toDisplayLabel(item)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.category]} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!form.formState.errors.locationType}>
              <FieldLabel>Location Type</FieldLabel>
              <FieldContent>
                <Controller
                  name="locationType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={!!form.formState.errors.locationType}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {LOCATION_TYPES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {toDisplayLabel(item)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[form.formState.errors.locationType]} />
              </FieldContent>
            </Field>

            {props.mode === "edit" ? (
              <Field data-invalid={!!form.formState.errors.status}>
                <FieldLabel>Status</FieldLabel>
                <FieldContent>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={!!form.formState.errors.status}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {INTERNSHIP_STATUSES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {toDisplayLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[form.formState.errors.status]} />
                </FieldContent>
              </Field>
            ) : null}
          </FieldSet>

          <FieldSet className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FieldLegend className="sr-only">Details</FieldLegend>

            <Field data-invalid={!!form.formState.errors.duration}>
              <FieldLabel htmlFor="duration">Duration</FieldLabel>
              <Input
                id="duration"
                placeholder="e.g. 3 months"
                aria-invalid={!!form.formState.errors.duration}
                {...form.register("duration")}
              />
              <FieldError errors={[form.formState.errors.duration]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.stipend}>
              <FieldLabel htmlFor="stipend">Stipend (USD / month)</FieldLabel>
              <Input
                id="stipend"
                type="number"
                min={0}
                placeholder="400"
                aria-invalid={!!form.formState.errors.stipend}
                {...form.register("stipend")}
              />
              <FieldDescription>Optional</FieldDescription>
              <FieldError errors={[form.formState.errors.stipend]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.maxApplications}>
              <FieldLabel htmlFor="maxApplications">
                Max Applications
              </FieldLabel>
              <Input
                id="maxApplications"
                type="number"
                min={1}
                placeholder="50"
                aria-invalid={!!form.formState.errors.maxApplications}
                {...form.register("maxApplications")}
              />
              <FieldDescription>Optional</FieldDescription>
              <FieldError errors={[form.formState.errors.maxApplications]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.applicationDeadline}>
              <FieldLabel htmlFor="applicationDeadline">Deadline</FieldLabel>
              <Controller
                name="applicationDeadline"
                control={form.control}
                render={({ field }) => {
                  const selectedDate = field.value
                    ? new Date(`${field.value}T00:00:00`)
                    : undefined;

                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="applicationDeadline"
                          type="button"
                          variant="outline"
                          aria-invalid={
                            !!form.formState.errors.applicationDeadline
                          }
                          className={cn(
                            "h-8 w-full justify-between px-2.5 font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {formatDateLabel(field.value)}
                          <CalendarIcon
                            data-icon="inline-end"
                            className="text-muted-foreground"
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          defaultMonth={selectedDate}
                          timeZone={calendarTimeZone}
                          disabled={(date) => date < minSelectableDate}
                          onSelect={(date) => {
                            if (!date) {
                              field.onChange("");
                              return;
                            }

                            field.onChange(formatDateValue(date));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                }}
              />
              <FieldError
                errors={[form.formState.errors.applicationDeadline]}
              />
            </Field>
          </FieldSet>
        </section>

        <Separator />

        <section className="grid gap-4">
          <p className="text-sm font-medium text-foreground">
            Description &amp; requirements
          </p>
          <div className="grid gap-6">
            <FieldSet>
              <FieldLegend className="sr-only">Description</FieldLegend>
              <Field data-invalid={!!form.formState.errors.description}>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChangeAction={(value) => field.onChange(value)}
                      />
                    )}
                  />
                  <FieldDescription>
                    Use short paragraphs and lists so the posting stays easy to
                    scan.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.description]} />
                </FieldContent>
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend className="sr-only">Requirements</FieldLegend>
              <Field data-invalid={!!form.formState.errors.requirementsText}>
                <FieldLabel htmlFor="requirementsText">Requirements</FieldLabel>
                <Textarea
                  id="requirementsText"
                  rows={6}
                  placeholder={
                    "Strong communication skills\nAble to work across product and engineering\nAvailable for at least 6 months"
                  }
                  aria-invalid={!!form.formState.errors.requirementsText}
                  {...form.register("requirementsText")}
                />
                <FieldDescription>One per line.</FieldDescription>
                <FieldError errors={[form.formState.errors.requirementsText]} />
              </Field>
            </FieldSet>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Published listings are immediately visible to candidates.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.push(destination)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmittingDraft && <Spinner />}
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={form.handleSubmit((values) => {
                setSubmitIntent("open");
                return submit(values, "open");
              })}
            >
              {isSubmittingPublish ? (
                <Spinner />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Publish
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
