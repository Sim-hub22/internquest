"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  MapPinIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const ROLE_PRESENTATION = {
  candidate: {
    label: "Candidate",
    heroClass: "border-border/70 bg-card",
    tintClass: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-500",
  },
  recruiter: {
    label: "Recruiter",
    heroClass: "border-border/70 bg-card",
    tintClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  fallback: {
    label: "Unassigned",
    heroClass: "border-border/70 bg-card",
    tintClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MetricTile({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
}) {
  return (
    <div className="group rounded-xl border border-border/70 bg-card p-5 shadow-sm transition-colors hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/70 p-2.5 text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card p-4 transition-colors hover:bg-card",
        className
      )}
    >
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 text-sm leading-6 font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatusMeterList({
  items,
  toneClass,
}: {
  items: { count: number; label: string; status: string }[];
  toneClass: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width =
          item.count === 0
            ? "0%"
            : `${Math.max((item.count / maxValue) * 100, 12)}%`;

        return (
          <div
            key={item.status}
            className="rounded-lg border border-border/70 bg-card p-4"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {item.count}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  toneClass
                )}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminUserDetailPage({ userId }: { userId: Id<"users"> }) {
  const { isAuthenticated } = useConvexAuth();
  const detail = useQuery(
    api.admin.getUserDetail,
    isAuthenticated ? { userId } : "skip"
  );
  const suspendUser = useMutation(api.admin.suspendUser);
  const unsuspendUser = useMutation(api.admin.unsuspendUser);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [suspensionNote, setSuspensionNote] = useState("");
  const [isMutating, startTransition] = useTransition();

  if (detail === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:gap-8 lg:p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`admin-user-detail-metric-${index}`}
              className="h-40 rounded-xl"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-112 rounded-xl" />
          <Skeleton className="h-112 rounded-xl" />
        </div>
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>User not found</EmptyTitle>
            <EmptyDescription>
              This account could not be loaded. It may have been removed
              already.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const roleTheme =
    detail.user.role === "candidate"
      ? ROLE_PRESENTATION.candidate
      : detail.user.role === "recruiter"
        ? ROLE_PRESENTATION.recruiter
        : ROLE_PRESENTATION.fallback;
  const actionLabel = detail.user.isSuspended
    ? "Unsuspend user"
    : "Suspend user";
  const isSuspending = !detail.user.isSuspended;

  const primaryMetrics =
    detail.activitySummary.kind === "candidate"
      ? [
          {
            label: "Applications",
            value: detail.activitySummary.totalApplications,
            description:
              "Total submissions currently associated with this user.",
            icon: ClipboardListIcon,
          },
          {
            label: "Skills tracked",
            value: detail.candidateProfile?.skillsCount ?? 0,
            description:
              "Skills currently listed on the candidate profile and visible to recruiters.",
            icon: SparklesIcon,
          },
          {
            label: "Experience entries",
            value: detail.candidateProfile?.experienceCount ?? 0,
            description:
              "Work history items available to support application screening.",
            icon: BriefcaseBusinessIcon,
          },
          {
            label: "Education entries",
            value: detail.candidateProfile?.educationCount ?? 0,
            description:
              "Academic records captured in the profile for qualification review.",
            icon: GraduationCapIcon,
          },
        ]
      : [
          {
            label: "Internships managed",
            value: detail.activitySummary.totalInternships,
            description:
              "Listings created by this recruiter and tracked from the admin workspace.",
            icon: BriefcaseBusinessIcon,
          },
          {
            label: "Applications received",
            value: detail.activitySummary.totalApplications,
            description:
              "Candidate submissions collected across this recruiter's listings.",
            icon: ClipboardListIcon,
          },
          {
            label: "Listing stages in use",
            value: detail.activitySummary.statuses.filter(
              (item) => item.count > 0
            ).length,
            description:
              "Distinct internship states currently active for this recruiter.",
            icon: SparklesIcon,
          },
          {
            label: "Account role",
            value: roleTheme.label,
            description:
              "Permissions currently granted to the user inside the platform.",
            icon: UserRoundIcon,
          },
        ];

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        if (detail.user.isSuspended) {
          await unsuspendUser({ userId: detail.user._id });
          toast.success("User unsuspended");
        } else {
          await suspendUser({
            userId: detail.user._id,
            reason: suspensionNote,
          });
          toast.success("User suspended");
        }
        setIsDialogOpen(false);
        setSuspensionNote("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update user"
        );
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:gap-8 lg:p-6">
      <section
        className={cn(
          "relative overflow-hidden rounded-xl border px-5 py-5 shadow-sm sm:px-6 sm:py-6 lg:px-8 lg:py-8",
          roleTheme.heroClass
        )}
      >
        <div className="relative flex flex-col gap-6">
          <Button asChild variant="ghost" className="-ml-3 w-fit">
            <Link href={"/admin/users" as Route}>
              <ArrowLeftIcon />
              Back to users
            </Link>
          </Button>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_20rem]">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4 sm:gap-5">
                  <Avatar className="size-20 border border-border/70 shadow-sm">
                    <AvatarImage
                      src={detail.user.imageUrl}
                      alt={detail.user.name}
                    />
                    <AvatarFallback className="text-lg font-semibold">
                      {getInitials(detail.user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("border", roleTheme.tintClass)}
                      >
                        {roleTheme.label}
                      </Badge>
                      <Badge
                        variant={
                          detail.user.isSuspended ? "destructive" : "secondary"
                        }
                        className={cn(
                          !detail.user.isSuspended &&
                            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {detail.user.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
                        Admin user detail
                      </p>
                      <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight wrap-break-word sm:text-4xl">
                          {detail.user.name}
                        </h1>
                        <p className="text-sm leading-6 break-all text-muted-foreground sm:text-base">
                          {detail.user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailBlock
                  label="Username"
                  value={`@${detail.user.username}`}
                />
                <DetailBlock
                  label="Joined"
                  value={DATE_FORMATTER.format(new Date(detail.user.createdAt))}
                />
                <DetailBlock
                  label="Last updated"
                  value={DATE_FORMATTER.format(new Date(detail.user.updatedAt))}
                />
                <DetailBlock
                  label="Suspended at"
                  value={
                    detail.user.suspendedAt
                      ? DATE_FORMATTER.format(new Date(detail.user.suspendedAt))
                      : "Not suspended"
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
              <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
                Access control
              </p>
              <div className="mt-4 flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 size-3 shrink-0 rounded-full",
                    detail.user.isSuspended
                      ? "bg-destructive"
                      : roleTheme.dotClass
                  )}
                />
                <div className="space-y-1">
                  <p className="text-lg font-semibold tracking-tight">
                    {detail.user.isSuspended
                      ? "Access is blocked"
                      : "Access is currently enabled"}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {detail.user.isSuspended
                      ? "Protected routes and role-gated Convex APIs are restricted until the account is restored."
                      : "This user can reach protected routes and role-specific features with their current permissions."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-border/70 bg-muted/45 p-4">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Latest moderation note
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  {detail.user.suspensionReason ??
                    "No suspension reason has been recorded for this account."}
                </p>
              </div>

              <Button
                className="mt-5 w-full"
                variant={detail.user.isSuspended ? "outline" : "destructive"}
                onClick={() => setIsDialogOpen(true)}
              >
                {detail.user.isSuspended ? (
                  <ShieldCheckIcon />
                ) : (
                  <ShieldAlertIcon />
                )}
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <MetricTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
          />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Profile signals
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {detail.candidateProfile
                ? "Candidate profile overview"
                : "Profile snapshot unavailable"}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {detail.candidateProfile
                ? "These fields help admins understand how complete and targeted the candidate's profile is at a glance."
                : detail.activitySummary.kind === "recruiter"
                  ? "Recruiter accounts do not expose a candidate profile snapshot in this workspace."
                  : "No candidate profile has been created for this account yet."}
            </p>
          </div>

          {detail.candidateProfile ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <DetailBlock
                label="Headline"
                value={detail.candidateProfile.headline ?? "Not added"}
                className="md:col-span-2"
              />
              <DetailBlock
                label="Location"
                value={detail.candidateProfile.location ?? "Not added"}
              />
              <DetailBlock
                label="Preferred work mode"
                value={
                  detail.candidateProfile.preferredLocationType ?? "Not set"
                }
              />
              <DetailBlock
                label="Preferred categories"
                value={
                  detail.candidateProfile.preferredCategories.length > 0
                    ? detail.candidateProfile.preferredCategories.join(", ")
                    : "No preferences set"
                }
                className="md:col-span-2"
              />
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-muted/30 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Use the activity panel to understand how this account interacts
                with the platform even without profile metadata.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Activity summary
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {detail.activitySummary.kind === "candidate"
                ? "Application pipeline"
                : "Recruitment pipeline"}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {detail.activitySummary.kind === "candidate"
                ? "Counts below show where the user's applications currently sit in the review process."
                : "Counts below show how this recruiter's internship listings are distributed across publishing stages."}
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-border/70 bg-muted/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Total tracked
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight">
                  {detail.activitySummary.kind === "candidate"
                    ? detail.activitySummary.totalApplications
                    : detail.activitySummary.totalInternships}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card p-3 text-muted-foreground">
                {detail.activitySummary.kind === "candidate" ? (
                  <ClipboardListIcon className="size-5" />
                ) : (
                  <MapPinIcon className="size-5" />
                )}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {detail.activitySummary.kind === "candidate"
                ? "Every submission linked to this candidate across the platform."
                : "Every internship listing created by this recruiter and visible to admins."}
            </p>
          </div>

          <div className="mt-4">
            <StatusMeterList
              items={detail.activitySummary.statuses}
              toneClass={cn(
                detail.user.isSuspended ? "bg-destructive" : roleTheme.dotClass
              )}
            />
          </div>
        </section>
      </div>

      <AlertDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSuspensionNote("");
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={cn(
                detail.user.isSuspended
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {detail.user.isSuspended ? (
                <ShieldCheckIcon />
              ) : (
                <ShieldAlertIcon />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>{actionLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {detail.user.isSuspended
                ? `${detail.user.name} will regain access to protected routes and authenticated Convex APIs.`
                : `${detail.user.name} will be redirected away from protected routes and blocked from role-gated Convex APIs.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isSuspending ? (
            <div className="space-y-2 px-1">
              <p className="text-sm font-medium">Suspension note</p>
              <Textarea
                value={suspensionNote}
                onChange={(event) => setSuspensionNote(event.target.value)}
                placeholder="Add context for why this account is being suspended."
                rows={4}
                disabled={isMutating}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                This note will be saved as the latest moderation note for the
                account.
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={handleConfirm}
              variant={detail.user.isSuspended ? "default" : "destructive"}
            >
              {actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
