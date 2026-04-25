"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import { CandidateResumeLibrarySection } from "@/components/candidate-resume-library-section";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";

const INTERNSHIP_CATEGORIES = [
  "technology",
  "business",
  "design",
  "marketing",
  "finance",
  "healthcare",
  "other",
] as const;

function isInternshipCategory(
  value: string
): value is (typeof INTERNSHIP_CATEGORIES)[number] {
  return (INTERNSHIP_CATEGORIES as readonly string[]).includes(value);
}

const LOCATION_TYPES = ["remote", "onsite", "hybrid"] as const;
const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced"] as const;

const emptyEducation = {
  institution: "",
  degree: "",
  graduationYear: "",
  gpa: "",
};

const emptySkill = {
  name: "",
  proficiency: "beginner" as (typeof PROFICIENCY_LEVELS)[number],
};

const emptyExperience = {
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  description: "",
};

const profileFormSchema = z.object({
  headline: z.string().optional(),
  location: z.string().optional(),
  preferredCategories: z.array(z.enum(INTERNSHIP_CATEGORIES)),
  preferredLocationType: z.enum(LOCATION_TYPES).optional(),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      graduationYear: z.string(),
      gpa: z.string().optional(),
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      proficiency: z.enum(PROFICIENCY_LEVELS),
    })
  ),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  links: z.object({
    github: z.string().optional(),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const DEFAULT_VALUES: ProfileFormValues = {
  headline: "",
  location: "",
  preferredCategories: [],
  preferredLocationType: undefined,
  education: [emptyEducation],
  skills: [emptySkill],
  experience: [],
  links: {
    github: "",
    linkedin: "",
    portfolio: "",
  },
};

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function trimOrUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalNumber(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

export function CandidateProfileForm() {
  const router = useRouter();
  const profile = useQuery(api.candidateProfiles.current, {});
  const upsertProfile = useMutation(api.candidateProfiles.upsert);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const educationArray = useFieldArray({
    control: form.control,
    name: "education",
  });

  const skillsArray = useFieldArray({
    control: form.control,
    name: "skills",
  });

  const experienceArray = useFieldArray({
    control: form.control,
    name: "experience",
  });

  useEffect(() => {
    if (profile === undefined) {
      return;
    }

    if (!profile) {
      form.reset(DEFAULT_VALUES);
      return;
    }

    form.reset({
      headline: profile.headline ?? "",
      location: profile.location ?? "",
      preferredCategories: (profile.preferredCategories ?? []).filter(
        isInternshipCategory
      ),
      preferredLocationType: profile.preferredLocationType,
      education:
        profile.education.length > 0
          ? profile.education.map((entry) => ({
              institution: entry.institution,
              degree: entry.degree,
              graduationYear: String(entry.graduationYear),
              gpa: entry.gpa === undefined ? "" : String(entry.gpa),
            }))
          : [emptyEducation],
      skills:
        profile.skills.length > 0
          ? profile.skills
          : [
              {
                name: "",
                proficiency: "beginner",
              },
            ],
      experience: profile.experience.map((entry) => ({
        title: entry.title,
        company: entry.company,
        startDate: entry.startDate,
        endDate: entry.endDate ?? "",
        description: entry.description ?? "",
      })),
      links: {
        github: profile.links.github ?? "",
        linkedin: profile.links.linkedin ?? "",
        portfolio: profile.links.portfolio ?? "",
      },
    });
  }, [form, profile]);

  const isSubmitting = form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;
  const preferredCategories =
    useWatch({
      control: form.control,
      name: "preferredCategories",
    }) ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your profile up to date so recruiters can evaluate you quickly.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={"/candidate/dashboard" as Route}>Back to dashboard</Link>
        </Button>
      </div>

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          const cleanEducation = values.education
            .map((entry) => ({
              institution: entry.institution.trim(),
              degree: entry.degree.trim(),
              graduationYear: Number(entry.graduationYear.trim()),
              gpa: parseOptionalNumber(entry.gpa),
            }))
            .filter(
              (entry) =>
                entry.institution &&
                entry.degree &&
                Number.isFinite(entry.graduationYear)
            );

          const cleanSkills = values.skills
            .map((entry) => ({
              name: entry.name.trim(),
              proficiency: entry.proficiency,
            }))
            .filter((entry) => entry.name);

          const cleanExperience = values.experience
            .map((entry) => ({
              title: entry.title.trim(),
              company: entry.company.trim(),
              startDate: entry.startDate.trim(),
              endDate: trimOrUndefined(entry.endDate),
              description: trimOrUndefined(entry.description),
            }))
            .filter((entry) => entry.title && entry.company && entry.startDate);

          try {
            await upsertProfile({
              headline: trimOrUndefined(values.headline),
              location: trimOrUndefined(values.location),
              preferredCategories:
                values.preferredCategories.length > 0
                  ? values.preferredCategories
                  : undefined,
              preferredLocationType: values.preferredLocationType,
              education: cleanEducation,
              skills: cleanSkills,
              experience: cleanExperience,
              links: {
                github: trimOrUndefined(values.links.github),
                linkedin: trimOrUndefined(values.links.linkedin),
                portfolio: trimOrUndefined(values.links.portfolio),
              },
            });
            toast.success("Profile updated");
            router.push("/candidate/dashboard" as Route);
          } catch (error) {
            console.error(error);
            toast.error("Unable to save profile");
          }
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Add your headline and location so recruiters get context at a
              glance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="headline">Headline</FieldLabel>
              <Input
                id="headline"
                placeholder="Computer Science student seeking backend internships"
                {...form.register("headline")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                placeholder="Kathmandu, Nepal"
                {...form.register("location")}
              />
            </Field>
          </CardContent>
        </Card>

        <CandidateResumeLibrarySection />

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              These preferences are used to match you with relevant internships.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel>Preferred Categories</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {INTERNSHIP_CATEGORIES.map((category) => {
                  const checked = preferredCategories.includes(category);

                  return (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          const current = form.getValues("preferredCategories");

                          if (isChecked) {
                            form.setValue("preferredCategories", [
                              ...current,
                              category,
                            ]);
                            return;
                          }

                          form.setValue(
                            "preferredCategories",
                            current.filter((item) => item !== category)
                          );
                        }}
                      />
                      {toDisplayLabel(category)}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field>
              <FieldLabel>Preferred Location Type</FieldLabel>
              <Controller
                control={form.control}
                name="preferredLocationType"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Any</SelectItem>
                        {LOCATION_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {toDisplayLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Education</CardTitle>
              <CardDescription>
                Add one or more education entries.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => educationArray.append(emptyEducation)}
            >
              <PlusIcon className="mr-1 size-4" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {educationArray.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4">
                <div className="mb-3 flex justify-between">
                  <p className="text-sm font-medium">Entry {index + 1}</p>
                  {educationArray.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => educationArray.remove(index)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Institution</FieldLabel>
                    <Input
                      {...form.register(`education.${index}.institution`)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Degree</FieldLabel>
                    <Input {...form.register(`education.${index}.degree`)} />
                  </Field>
                  <Field>
                    <FieldLabel>Graduation Year</FieldLabel>
                    <Input
                      type="number"
                      {...form.register(`education.${index}.graduationYear`)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>GPA (optional)</FieldLabel>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`education.${index}.gpa`)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                List your core skills and proficiency.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => skillsArray.append(emptySkill)}
            >
              <PlusIcon className="mr-1 size-4" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px_auto]"
              >
                <Field>
                  <FieldLabel>Skill</FieldLabel>
                  <Input {...form.register(`skills.${index}.name`)} />
                </Field>
                <Field>
                  <FieldLabel>Proficiency</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`skills.${index}.proficiency`}
                    render={({ field: controllerField }) => (
                      <Select
                        value={controllerField.value}
                        onValueChange={controllerField.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {PROFICIENCY_LEVELS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {toDisplayLabel(value)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => skillsArray.remove(index)}
                    disabled={skillsArray.fields.length === 1}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Experience (optional)</CardTitle>
              <CardDescription>
                Add internships, projects, or prior work experience.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => experienceArray.append(emptyExperience)}
            >
              <PlusIcon className="mr-1 size-4" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {experienceArray.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No experience entries yet.
              </p>
            ) : null}

            {experienceArray.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4">
                <div className="mb-3 flex justify-between">
                  <p className="text-sm font-medium">Entry {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => experienceArray.remove(index)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input {...form.register(`experience.${index}.title`)} />
                  </Field>
                  <Field>
                    <FieldLabel>Company</FieldLabel>
                    <Input {...form.register(`experience.${index}.company`)} />
                  </Field>
                  <Field>
                    <FieldLabel>Start Date</FieldLabel>
                    <Input
                      placeholder="2025-01"
                      {...form.register(`experience.${index}.startDate`)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>End Date (optional)</FieldLabel>
                    <Input
                      placeholder="2025-06"
                      {...form.register(`experience.${index}.endDate`)}
                    />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel>Description (optional)</FieldLabel>
                    <Input
                      {...form.register(`experience.${index}.description`)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              Include portfolio or social links recruiters can review.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel>GitHub</FieldLabel>
              <Input
                placeholder="https://github.com/username"
                {...form.register("links.github")}
              />
            </Field>
            <Field>
              <FieldLabel>LinkedIn</FieldLabel>
              <Input
                placeholder="https://linkedin.com/in/username"
                {...form.register("links.linkedin")}
              />
            </Field>
            <Field>
              <FieldLabel>Portfolio</FieldLabel>
              <Input
                placeholder="https://your-portfolio.com"
                {...form.register("links.portfolio")}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={"/candidate/dashboard" as Route}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving..." : "Save profile"}
          </Button>
        </div>

        <Field>
          <FieldContent>
            <FieldError errors={[form.formState.errors.education]} />
            <FieldError errors={[form.formState.errors.skills]} />
            <FieldError errors={[form.formState.errors.experience]} />
          </FieldContent>
        </Field>
      </form>
    </div>
  );
}
