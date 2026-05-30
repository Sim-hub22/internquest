"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import {
  INTERNSHIP_STATUSES,
  LOCATION_TYPES,
  getCategoryLabel,
  getCategoryOptions,
  isRetiredCategorySlug,
  toDisplayLabel,
} from "@/components/internships/constants";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
  category: z.string().min(1, "Select a primary category"),
  categories: z.array(z.string()).min(1, "Select at least one category"),
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
  categories: ["technology"],
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
  const requestCategory = useMutation(api.internshipCategories.request);
  const approvedCategories = useQuery(api.internshipCategories.listApproved);
  const [requestedCategoryName, setRequestedCategoryName] = useState("");
  const [isRequestingCategory, setIsRequestingCategory] = useState(false);

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
  const primaryCategory = form.watch("category");
  const selectedCategories = form.watch("categories");
  const categoryOptions = useMemo(() => {
    const options = [...getCategoryOptions(approvedCategories)];
    const currentSlugs = new Set(options.map((category) => category.slug));

    for (const slug of [primaryCategory, ...selectedCategories]) {
      if (isRetiredCategorySlug(slug)) {
        continue;
      }

      if (slug && !currentSlugs.has(slug)) {
        options.push({ slug, name: toDisplayLabel(slug) });
        currentSlugs.add(slug);
      }
    }

    return options;
  }, [approvedCategories, primaryCategory, selectedCategories]);

  useEffect(() => {
    if (!internship || props.mode !== "edit") {
      return;
    }

    const primaryCategory = isRetiredCategorySlug(internship.category)
      ? DEFAULT_VALUES.category
      : internship.category;
    const categories =
      internship.categories && internship.categories.length > 0
        ? Array.from(new Set([primaryCategory, ...internship.categories]))
        : [primaryCategory];

    form.reset({
      title: internship.title,
      company: internship.company,
      description: internship.description,
      category: primaryCategory,
      categories: categories.filter(
        (category) => !isRetiredCategorySlug(category)
      ),
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
    const categories = Array.from(
      new Set([values.category, ...values.categories])
    ).filter((category) => !isRetiredCategorySlug(category));

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
          categories,
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
          categories,
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

  const handleRequestCategory = async () => {
    const name = requestedCategoryName.trim();

    if (!name) {
      toast.error("Enter a category name to request");
      return;
    }

    try {
      setIsRequestingCategory(true);
      const requestedCategory = await requestCategory({ name });

      if (requestedCategory?.status === "pending") {
        toast.success("Category request sent for admin review");
      } else {
        toast.success("Category request updated");
      }

      setRequestedCategoryName("");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to request category"
      );
    } finally {
      setIsRequestingCategory(false);
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
              <FieldLabel>Primary Category</FieldLabel>
              <FieldContent>
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const current = form.getValues("categories");
                        if (!current.includes(value)) {
                          form.setValue("categories", [...current, value], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={!!form.formState.errors.category}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {categoryOptions.map((item) => (
                            <SelectItem key={item.slug} value={item.slug}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>
                  Used as the main reporting category.
                </FieldDescription>
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

          <Field data-invalid={!!form.formState.errors.categories}>
            <FieldLabel>Additional Categories</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categoryOptions.map((item) => {
                const checked = selectedCategories.includes(item.slug);
                const isPrimary = primaryCategory === item.slug;

                return (
                  <label
                    key={item.slug}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isPrimary}
                      onCheckedChange={(nextChecked) => {
                        const current = form.getValues("categories");
                        if (nextChecked) {
                          form.setValue(
                            "categories",
                            Array.from(new Set([...current, item.slug])),
                            { shouldDirty: true, shouldValidate: true }
                          );
                          return;
                        }

                        form.setValue(
                          "categories",
                          current.filter((category) => category !== item.slug),
                          { shouldDirty: true, shouldValidate: true }
                        );
                      }}
                    />
                    <span>{getCategoryLabel(item.slug, categoryOptions)}</span>
                    {isPrimary ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Primary
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            <FieldDescription>
              Select every area this internship fits so candidates can find
              cross-domain roles.
            </FieldDescription>
            <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center">
              <Input
                value={requestedCategoryName}
                onChange={(event) =>
                  setRequestedCategoryName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRequestCategory();
                  }
                }}
                placeholder="Request a new category"
                className="bg-background"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleRequestCategory}
                disabled={isRequestingCategory}
                className="sm:w-auto"
              >
                {isRequestingCategory ? <Spinner /> : <PlusIcon />}
                Request
              </Button>
            </div>
            <FieldDescription>
              Requested categories become available after admin approval.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.categories]} />
          </Field>

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
              <FieldLabel htmlFor="stipend">Stipend (NPR / month)</FieldLabel>
              <Input
                id="stipend"
                type="number"
                min={0}
                placeholder="25000"
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
