"use client";

import type { Route } from "next";
import Link from "next/link";

import { usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MapPinIcon,
  SparklesIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";
import { CANDIDATE_RESUMES_PAGE_SIZE } from "@/lib/resume-library";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function LinkItem({
  href,
  label,
}: {
  href: string | undefined;
  label: string;
}) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ArrowUpRightIcon className="size-3.5" />
    </a>
  );
}

export function ProfilePageContent() {
  const user = useQuery(api.users.current, {});
  const profile = useQuery(
    api.candidateProfiles.current,
    user?.role === "candidate" ? {} : "skip"
  );
  const {
    results: savedResumes,
    status: savedResumesStatus,
    loadMore: loadMoreSavedResumes,
  } = usePaginatedQuery(
    api.candidateResumes.listForCurrentUser,
    user?.role === "candidate" ? {} : "skip",
    { initialNumItems: CANDIDATE_RESUMES_PAGE_SIZE }
  );

  if (user === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>
              We could not load your account profile right now.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const roleLabel = user.role ? toDisplayLabel(user.role) : "Unassigned";
  const completeness =
    user.role === "candidate" && profile !== undefined
      ? calculateProfileCompleteness(profile)
      : 0;
  const skillsCount = profile ? profile.skills.length : 0;
  const experienceCount = profile ? profile.experience.length : 0;
  const educationCount = profile ? profile.education.length : 0;
  const preferredCategories = profile?.preferredCategories ?? [];
  const preferredLocationType = profile?.preferredLocationType;
  const hasPreferences =
    preferredCategories.length > 0 || Boolean(preferredLocationType);
  const isLoadingSavedResumes = savedResumesStatus === "LoadingFirstPage";
  const isLoadingMoreSavedResumes = savedResumesStatus === "LoadingMore";
  const canLoadMoreSavedResumes = savedResumesStatus === "CanLoadMore";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <Card className="relative overflow-hidden">
        <CardContent className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="size-16 ring-2 ring-primary/20" size="lg">
                <AvatarImage src={user.imageUrl} alt={`${user.name} avatar`} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {user.name}
                  </h1>
                  <Badge variant="secondary">{roleLabel}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{user.username}
                </p>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Review your account details and present a polished candidate
                  profile to recruiters.
                </p>
              </div>
            </div>

            {user.role === "candidate" ? (
              <div className="w-full rounded-xl border border-border/70 bg-background/80 p-4 sm:max-w-xs">
                <div className="flex items-center justify-between text-xs tracking-wide text-muted-foreground uppercase">
                  <span>Profile score</span>
                  <span>{completeness}%</span>
                </div>
                <Progress value={completeness} className="mt-3" />
                <p className="mt-3 text-xs text-muted-foreground">
                  A stronger profile helps you move faster through recruiter
                  shortlisting.
                </p>
              </div>
            ) : null}
          </div>

          {user.role === "candidate" ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-background/80 p-3">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Skills
                </p>
                <p className="mt-1 text-xl font-semibold">{skillsCount}</p>
              </div>
              <div className="rounded-lg border bg-background/80 p-3">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Education
                </p>
                <p className="mt-1 text-xl font-semibold">{educationCount}</p>
              </div>
              <div className="rounded-lg border bg-background/80 p-3">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Experience
                </p>
                <p className="mt-1 text-xl font-semibold">{experienceCount}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Basic account information from your user record.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Full name
            </p>
            <p className="mt-1 text-sm font-medium">{user.name}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Username
            </p>
            <p className="mt-1 text-sm font-medium">@{user.username}</p>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Email
            </p>
            <p className="mt-1 text-sm font-medium">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      {user.role === "candidate" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-primary" />
                Profile actions
              </CardTitle>
              <CardDescription>
                Keep this profile updated so recruiters can quickly evaluate
                your strengths.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile === undefined ? (
                <>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <Progress value={completeness} />
                  <p className="text-sm text-muted-foreground">
                    {completeness}% complete
                  </p>
                </>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={"/candidate/profile/edit" as Route}>
                    Edit Profile
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={"/candidate/profile/wizard" as Route}>
                    Open Wizard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidate overview preview</CardTitle>
              <CardDescription>
                Review how your candidate profile details, preferences, and
                saved application assets are presented here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile === undefined ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : !profile ? (
                <p className="text-sm text-muted-foreground">
                  No candidate profile found yet. Start by adding your details.
                </p>
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {profile.headline ?? "Headline not added"}
                      </p>
                      {profile.location ? (
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPinIcon className="size-3.5" />
                          {profile.location}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Skills</p>
                    {profile.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <Badge key={skill.name} variant="outline">
                            {skill.name} ({toDisplayLabel(skill.proficiency)})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No skills added.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preferences</p>
                    {hasPreferences ? (
                      <div className="space-y-3">
                        {preferredCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {preferredCategories.map((category) => (
                              <Badge key={category} variant="secondary">
                                {toDisplayLabel(category)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {preferredLocationType ? (
                          <div className="rounded-md border p-3">
                            <p className="text-xs tracking-wide text-muted-foreground uppercase">
                              Preferred location
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {toDisplayLabel(preferredLocationType)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No preferences added.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Education</p>
                    {profile.education.length > 0 ? (
                      <div className="space-y-2">
                        {profile.education.map((entry, index) => (
                          <div
                            key={`${entry.institution}-${index}`}
                            className="rounded-md border p-3"
                          >
                            <p className="text-sm font-medium">
                              {entry.degree} - {entry.institution}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Graduation: {entry.graduationYear}
                              {entry.gpa ? ` | GPA: ${entry.gpa}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No education entries added.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Experience</p>
                    {profile.experience.length > 0 ? (
                      <div className="space-y-2">
                        {profile.experience.map((entry, index) => (
                          <div
                            key={`${entry.company}-${entry.title}-${index}`}
                            className="rounded-md border p-3"
                          >
                            <p className="text-sm font-medium">
                              {entry.title} - {entry.company}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.startDate}
                              {entry.endDate ? ` - ${entry.endDate}` : ""}
                            </p>
                            {entry.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {entry.description}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No experience entries added.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Links</p>
                    <div className="flex flex-wrap gap-4">
                      <LinkItem href={profile.links.github} label="GitHub" />
                      <LinkItem
                        href={profile.links.linkedin}
                        label="LinkedIn"
                      />
                      <LinkItem
                        href={profile.links.portfolio}
                        label="Portfolio"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Saved resumes</p>
                    {isLoadingSavedResumes ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : savedResumes.length > 0 ? (
                      <div className="space-y-3">
                        {savedResumes.map((resume) => (
                          <div
                            key={resume._id}
                            className="rounded-md border p-3"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <FileTextIcon className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {resume.label}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                      {resume.originalFilename}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Added{" "}
                                  {DATE_TIME_FORMATTER.format(
                                    new Date(resume.createdAt)
                                  )}
                                  {resume.lastUsedAt
                                    ? ` | Last used ${DATE_TIME_FORMATTER.format(
                                        new Date(resume.lastUsedAt)
                                      )}`
                                    : ""}
                                </p>
                              </div>

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
                            </div>
                          </div>
                        ))}

                        {canLoadMoreSavedResumes ||
                        isLoadingMoreSavedResumes ? (
                          <div className="flex justify-center pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isLoadingMoreSavedResumes}
                              onClick={() =>
                                loadMoreSavedResumes(
                                  CANDIDATE_RESUMES_PAGE_SIZE
                                )
                              }
                            >
                              {isLoadingMoreSavedResumes
                                ? "Loading more..."
                                : "Load more resumes"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No saved resumes yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Role-specific profile</CardTitle>
            <CardDescription>
              Detailed candidate profile fields are only available for candidate
              accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page currently shows account-level information for your role.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
