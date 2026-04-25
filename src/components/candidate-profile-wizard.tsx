"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const LOCATION_TYPES = ["remote", "onsite", "hybrid"] as const;

type Category = (typeof INTERNSHIP_CATEGORIES)[number];
type LocationType = (typeof LOCATION_TYPES)[number];

type WizardState = {
  headline: string;
  location: string;
  preferredCategories: Category[];
  preferredLocationType: LocationType | "";
  educationInstitution: string;
  educationDegree: string;
  educationGraduationYear: string;
  educationGpa: string;
  skillsCsv: string;
  experienceTitle: string;
  experienceCompany: string;
  experienceStartDate: string;
  experienceEndDate: string;
  experienceDescription: string;
  github: string;
  linkedin: string;
  portfolio: string;
};

const DEFAULT_STATE: WizardState = {
  headline: "",
  location: "",
  preferredCategories: [],
  preferredLocationType: "",
  educationInstitution: "",
  educationDegree: "",
  educationGraduationYear: "",
  educationGpa: "",
  skillsCsv: "",
  experienceTitle: "",
  experienceCompany: "",
  experienceStartDate: "",
  experienceEndDate: "",
  experienceDescription: "",
  github: "",
  linkedin: "",
  portfolio: "",
};

const STEP_TITLES = [
  "Basics",
  "Preferences",
  "Education",
  "Skills & Experience",
  "Links & Save",
] as const;

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function CandidateProfileWizard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(
    api.candidateProfiles.current,
    isAuthenticated ? {} : "skip"
  );
  const upsertProfile = useMutation(api.candidateProfiles.upsert);

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<WizardState>(DEFAULT_STATE);

  useEffect(() => {
    if (profile === undefined || profile === null) {
      return;
    }

    const firstEducation = profile.education[0];
    const firstExperience = profile.experience[0];

    setFormState({
      headline: profile.headline ?? "",
      location: profile.location ?? "",
      preferredCategories: (profile.preferredCategories ?? []) as Category[],
      preferredLocationType: (profile.preferredLocationType ?? "") as
        | LocationType
        | "",
      educationInstitution: firstEducation?.institution ?? "",
      educationDegree: firstEducation?.degree ?? "",
      educationGraduationYear: firstEducation?.graduationYear
        ? String(firstEducation.graduationYear)
        : "",
      educationGpa:
        firstEducation?.gpa !== undefined ? String(firstEducation.gpa) : "",
      skillsCsv: profile.skills.map((skill) => skill.name).join(", "),
      experienceTitle: firstExperience?.title ?? "",
      experienceCompany: firstExperience?.company ?? "",
      experienceStartDate: firstExperience?.startDate ?? "",
      experienceEndDate: firstExperience?.endDate ?? "",
      experienceDescription: firstExperience?.description ?? "",
      github: profile.links.github ?? "",
      linkedin: profile.links.linkedin ?? "",
      portfolio: profile.links.portfolio ?? "",
    });
  }, [profile]);

  if (isLoading || (isAuthenticated && profile === undefined)) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 lg:p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const setField = <K extends keyof WizardState>(
    key: K,
    value: WizardState[K]
  ) => {
    setFormState((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggleCategory = (category: Category, checked: boolean) => {
    setFormState((previous) => {
      if (checked) {
        return {
          ...previous,
          preferredCategories: [...previous.preferredCategories, category],
        };
      }

      return {
        ...previous,
        preferredCategories: previous.preferredCategories.filter(
          (value) => value !== category
        ),
      };
    });
  };

  const nextStep = () => setStep((previous) => Math.min(5, previous + 1));
  const previousStep = () => setStep((previous) => Math.max(1, previous - 1));

  const submitWizard = async () => {
    const educationInstitution = formState.educationInstitution.trim();
    const educationDegree = formState.educationDegree.trim();
    const graduationYear = Number(formState.educationGraduationYear.trim());
    const hasValidEducation =
      educationInstitution &&
      educationDegree &&
      Number.isFinite(graduationYear) &&
      graduationYear > 1900;

    const skills = formState.skillsCsv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        proficiency: "intermediate" as const,
      }));

    const experienceTitle = formState.experienceTitle.trim();
    const experienceCompany = formState.experienceCompany.trim();
    const experienceStartDate = formState.experienceStartDate.trim();
    const hasExperience =
      experienceTitle && experienceCompany && experienceStartDate;

    try {
      setIsSaving(true);

      await upsertProfile({
        headline: trimOrUndefined(formState.headline),
        location: trimOrUndefined(formState.location),
        preferredCategories:
          formState.preferredCategories.length > 0
            ? formState.preferredCategories
            : undefined,
        preferredLocationType: formState.preferredLocationType || undefined,
        education: hasValidEducation
          ? [
              {
                institution: educationInstitution,
                degree: educationDegree,
                graduationYear,
                gpa: parseOptionalNumber(formState.educationGpa),
              },
            ]
          : [],
        skills,
        experience: hasExperience
          ? [
              {
                title: experienceTitle,
                company: experienceCompany,
                startDate: experienceStartDate,
                endDate: trimOrUndefined(formState.experienceEndDate),
                description: trimOrUndefined(formState.experienceDescription),
              },
            ]
          : [],
        links: {
          github: trimOrUndefined(formState.github),
          linkedin: trimOrUndefined(formState.linkedin),
          portfolio: trimOrUndefined(formState.portfolio),
        },
      });

      toast.success("Profile updated from wizard");
      router.push("/candidate/dashboard" as Route);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save profile wizard");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 lg:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Profile Setup Wizard
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete your profile in 5 quick steps.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEP_TITLES.map((title, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === step;
          const isComplete = stepNumber < step;

          return (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground"
              }`}
              key={title}
            >
              <p className="font-medium">Step {stepNumber}</p>
              <p>{title}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEP_TITLES[step - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <Field>
                <FieldLabel htmlFor="headline">Headline</FieldLabel>
                <Input
                  id="headline"
                  onChange={(event) => setField("headline", event.target.value)}
                  placeholder="CS student focused on backend internships"
                  value={formState.headline}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="location">Location</FieldLabel>
                <Input
                  id="location"
                  onChange={(event) => setField("location", event.target.value)}
                  placeholder="Kathmandu, Nepal"
                  value={formState.location}
                />
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field>
                <FieldLabel>Preferred Categories</FieldLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INTERNSHIP_CATEGORIES.map((category) => (
                    <label
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      key={category}
                    >
                      <Checkbox
                        checked={formState.preferredCategories.includes(
                          category
                        )}
                        onCheckedChange={(checked) =>
                          toggleCategory(category, Boolean(checked))
                        }
                      />
                      {toDisplayLabel(category)}
                    </label>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel>Preferred Location Type</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setField("preferredLocationType", value as LocationType)
                  }
                  value={formState.preferredLocationType || "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any</SelectItem>
                    {LOCATION_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {toDisplayLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field>
                <FieldLabel htmlFor="educationInstitution">
                  Institution
                </FieldLabel>
                <Input
                  id="educationInstitution"
                  onChange={(event) =>
                    setField("educationInstitution", event.target.value)
                  }
                  value={formState.educationInstitution}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="educationDegree">Degree</FieldLabel>
                <Input
                  id="educationDegree"
                  onChange={(event) =>
                    setField("educationDegree", event.target.value)
                  }
                  value={formState.educationDegree}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="educationGraduationYear">
                    Graduation Year
                  </FieldLabel>
                  <Input
                    id="educationGraduationYear"
                    onChange={(event) =>
                      setField("educationGraduationYear", event.target.value)
                    }
                    type="number"
                    value={formState.educationGraduationYear}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="educationGpa">GPA (optional)</FieldLabel>
                  <Input
                    id="educationGpa"
                    onChange={(event) =>
                      setField("educationGpa", event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={formState.educationGpa}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Field>
                <FieldLabel htmlFor="skillsCsv">Skills</FieldLabel>
                <Textarea
                  id="skillsCsv"
                  onChange={(event) =>
                    setField("skillsCsv", event.target.value)
                  }
                  placeholder="Type skills separated by commas (React, Node.js, SQL)"
                  value={formState.skillsCsv}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="experienceTitle">
                    Experience Title
                  </FieldLabel>
                  <Input
                    id="experienceTitle"
                    onChange={(event) =>
                      setField("experienceTitle", event.target.value)
                    }
                    placeholder="Backend Intern"
                    value={formState.experienceTitle}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="experienceCompany">
                    Experience Company
                  </FieldLabel>
                  <Input
                    id="experienceCompany"
                    onChange={(event) =>
                      setField("experienceCompany", event.target.value)
                    }
                    placeholder="InternQuest"
                    value={formState.experienceCompany}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="experienceStartDate">
                    Start Date
                  </FieldLabel>
                  <Input
                    id="experienceStartDate"
                    onChange={(event) =>
                      setField("experienceStartDate", event.target.value)
                    }
                    placeholder="2025-01"
                    value={formState.experienceStartDate}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="experienceEndDate">End Date</FieldLabel>
                  <Input
                    id="experienceEndDate"
                    onChange={(event) =>
                      setField("experienceEndDate", event.target.value)
                    }
                    placeholder="2025-06"
                    value={formState.experienceEndDate}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="experienceDescription">
                  Experience Description
                </FieldLabel>
                <Textarea
                  id="experienceDescription"
                  onChange={(event) =>
                    setField("experienceDescription", event.target.value)
                  }
                  value={formState.experienceDescription}
                />
              </Field>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <Field>
                <FieldLabel htmlFor="github">GitHub</FieldLabel>
                <Input
                  id="github"
                  onChange={(event) => setField("github", event.target.value)}
                  placeholder="https://github.com/username"
                  value={formState.github}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="linkedin">LinkedIn</FieldLabel>
                <Input
                  id="linkedin"
                  onChange={(event) => setField("linkedin", event.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  value={formState.linkedin}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="portfolio">Portfolio</FieldLabel>
                <Input
                  id="portfolio"
                  onChange={(event) =>
                    setField("portfolio", event.target.value)
                  }
                  placeholder="https://portfolio.dev"
                  value={formState.portfolio}
                />
              </Field>
              <p className="text-sm text-muted-foreground">
                Review your details and click Save Profile to finish.
              </p>
            </>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button
              disabled={step === 1}
              onClick={previousStep}
              type="button"
              variant="outline"
            >
              Back
            </Button>

            <div className="flex gap-2">
              <Button asChild type="button" variant="ghost">
                <Link href={"/candidate/profile/edit" as Route}>
                  Open full editor
                </Link>
              </Button>
              {step < 5 ? (
                <Button onClick={nextStep} type="button">
                  Next
                </Button>
              ) : (
                <Button
                  disabled={isSaving}
                  onClick={submitWizard}
                  type="button"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
