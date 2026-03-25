"use client";

import type { Route } from "next";
import Link from "next/link";

import { useConvexAuth, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CompassIcon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";

import {
  ANALYTICS_ACCENT_COLORS,
  APPLICATION_STATUS_COLORS,
  AnalyticsChartCard,
  AnalyticsMetricCard,
  formatWholeNumber,
} from "@/components/analytics/analytics-primitives";
import { toDisplayLabel } from "@/components/internships/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function statusVariant(status: string) {
  switch (status) {
    case "accepted":
      return "default";
    case "rejected":
      return "destructive";
    case "shortlisted":
    case "quiz_assigned":
    case "quiz_completed":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStipend(stipend?: number) {
  if (stipend === undefined) {
    return "Stipend not listed";
  }

  return `${CURRENCY_FORMATTER.format(stipend)} / month`;
}

function getQuizHref(item: {
  quizId: string;
  applicationId: string;
  attemptStatus: string | null;
}) {
  const isResult = item.attemptStatus === "submitted";

  return `${
    isResult
      ? `/candidate/quizzes/${item.quizId}/result`
      : `/candidate/quizzes/${item.quizId}`
  }?applicationId=${item.applicationId}` as Route;
}

function getQuizActionLabel(attemptStatus: string | null) {
  if (attemptStatus === "submitted") {
    return "Check Result";
  }

  if (attemptStatus === "in_progress") {
    return "Continue Quiz";
  }

  return "Start Quiz";
}

export function CandidateDashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const dashboard = useQuery(
    api.analytics.getCandidateDashboardOverview,
    isAuthenticated ? {} : "skip"
  );

  if (dashboard === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-136" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`candidate-dashboard-metric-${index}`}
              className="h-40"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <Skeleton className="h-112" />
          <Skeleton className="h-112" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const hasPipeline = dashboard.summary.applicationCount > 0;
  const hasQuizzes = dashboard.pendingQuizItems.length > 0;
  const hasNotifications = dashboard.unreadNotifications.length > 0;
  const hasMatchingInternships = dashboard.matchingInternships.length > 0;
  const statusBreakdown = dashboard.applicationStatusBreakdown
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      ...entry,
      fill:
        APPLICATION_STATUS_COLORS[entry.status] ?? ANALYTICS_ACCENT_COLORS.plum,
    }));
  const statusChartConfig = statusBreakdown.reduce<ChartConfig>(
    (config, entry) => {
      config[entry.status] = {
        label: entry.label,
        color: entry.fill,
      };
      return config;
    },
    {}
  );
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Candidate Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Start here to keep your profile sharp, stay close to active
            applications, and catch the next internship that fits what you are
            looking for.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={"/internships" as Route}>Browse Internships</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={"/candidate/applications" as Route}>
              View Applications
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Profile Completeness"
          value={`${dashboard.summary.profileCompleteness}%`}
          description={
            dashboard.profile.missingProfileSteps.length === 0
              ? "Your candidate profile is fully ready for recruiter review."
              : `${dashboard.profile.missingProfileSteps.length} profile step${
                  dashboard.profile.missingProfileSteps.length === 1 ? "" : "s"
                } still need attention.`
          }
          icon={UserRoundIcon}
        />
        <AnalyticsMetricCard
          title="Applications"
          value={formatWholeNumber(dashboard.summary.applicationCount)}
          description={
            hasPipeline
              ? `${formatWholeNumber(
                  dashboard.summary.activePipelineCount
                )} applications are still active in your pipeline.`
              : "You have not submitted any applications yet."
          }
          icon={ClipboardListIcon}
        />
        <AnalyticsMetricCard
          title="Pending Quizzes"
          value={formatWholeNumber(dashboard.summary.pendingQuizCount)}
          description={
            hasQuizzes
              ? "Assessments that still need a submission or are waiting on recruiter review."
              : "No quiz tasks are waiting on you right now."
          }
          icon={BookOpenIcon}
        />
        <AnalyticsMetricCard
          title="Unread Updates"
          value={formatWholeNumber(dashboard.summary.unreadNotificationCount)}
          description={
            hasNotifications
              ? "Fresh notifications linked to your applications and internship matches."
              : "No unread updates are sitting in your notification inbox."
          }
          icon={BellIcon}
        />
      </div>

      <div className="order-2 grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Matching Opportunities</CardTitle>
            <CardDescription>
              A compact shortlist of open internships based on your preferences,
              with fallbacks so the page never feels empty.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-full">
            {hasMatchingInternships ? (
              <div className="space-y-3">
                {dashboard.matchingInternships.map((internship) => (
                  <div
                    key={internship.internshipId}
                    className="rounded-2xl border border-border/70 bg-muted/10 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{internship.title}</p>
                          <Badge variant="outline">
                            {toDisplayLabel(internship.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {internship.company}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="size-3.5" />
                            {toDisplayLabel(internship.locationType)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CompassIcon className="size-3.5" />
                            Deadline{" "}
                            {DATE_FORMATTER.format(
                              new Date(internship.applicationDeadline)
                            )}
                          </span>
                          <span>{formatStipend(internship.stipend)}</span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={
                            `/internships/${internship.internshipId}` as Route
                          }
                        >
                          Explore Role
                          <ArrowRightIcon />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty className="h-full min-h-64 border border-dashed bg-muted/30">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CompassIcon />
                  </EmptyMedia>
                  <EmptyTitle>No matches just yet</EmptyTitle>
                  <EmptyDescription>
                    Update your preferences or browse all internships to widen
                    the pool of roles shown here.
                  </EmptyDescription>
                </EmptyHeader>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={"/internships" as Route}>
                      Browse internships
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={"/candidate/profile/edit" as Route}>
                      Update preferences
                    </Link>
                  </Button>
                </div>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Action Queue</CardTitle>
            <CardDescription>
              The shortest path to becoming application-ready and staying on top
              of recruiter responses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Profile checklist</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboard.profile.missingProfileSteps.length === 0
                      ? "Your profile is in strong shape."
                      : "Finish the missing pieces that recruiters notice first."}
                  </p>
                </div>
                <Badge
                  variant={
                    dashboard.profile.missingProfileSteps.length === 0
                      ? "default"
                      : "secondary"
                  }
                >
                  {dashboard.profile.missingProfileSteps.length === 0
                    ? "Ready"
                    : `${dashboard.profile.missingProfileSteps.length} left`}
                </Badge>
              </div>
              {dashboard.profile.missingProfileSteps.length === 0 ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600">
                  <CheckCircle2Icon className="size-4" />
                  Recruiter-facing profile basics are complete.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {dashboard.profile.missingProfileSteps
                    .slice(0, 4)
                    .map((step) => (
                      <div
                        key={step}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>{step}</span>
                      </div>
                    ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={"/candidate/profile/wizard" as Route}>
                    Open Wizard
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={"/candidate/profile/edit" as Route}>
                    Edit Profile
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Quiz tasks</p>
                  <p className="text-sm text-muted-foreground">
                    Assessments that still need your attention or final review.
                  </p>
                </div>
                <Badge variant={hasQuizzes ? "secondary" : "outline"}>
                  {hasQuizzes
                    ? `${dashboard.pendingQuizItems.length} active`
                    : "Clear"}
                </Badge>
              </div>
              {hasQuizzes ? (
                <div className="mt-3 space-y-3">
                  {dashboard.pendingQuizItems.map((item) => (
                    <div
                      key={item.applicationId}
                      className="rounded-2xl border border-border/70 bg-background/70 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium">{item.quizTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.internshipTitle} Â· {item.internshipCompany}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.attemptStatus === "submitted"
                              ? "Submitted and waiting for recruiter review."
                              : item.deadlineAt
                                ? `Deadline ${DATE_FORMATTER.format(
                                    new Date(item.deadlineAt)
                                  )}`
                                : item.quizAssignedAt
                                  ? `Assigned ${DATE_FORMATTER.format(
                                      new Date(item.quizAssignedAt)
                                    )}`
                                  : "Ready when you are."}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={getQuizHref(item)}>
                            {getQuizActionLabel(item.attemptStatus)}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                  No assigned quizzes are waiting on you right now.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Unread updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notification highlights from your application inbox.
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href={"/notifications" as Route}>Open Inbox</Link>
                </Button>
              </div>
              {hasNotifications ? (
                <div className="mt-3 space-y-3">
                  {dashboard.unreadNotifications.map((notification) => {
                    const content = (
                      <div
                        className={cn(
                          "rounded-2xl border border-border/70 bg-background/70 p-3 transition-colors",
                          notification.link && "hover:bg-background"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <BellIcon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {DATE_TIME_FORMATTER.format(
                                new Date(notification.createdAt)
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );

                    return notification.link ? (
                      <Link
                        key={notification.notificationId}
                        href={notification.link as Route}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={notification.notificationId}>{content}</div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                  No unread notifications at the moment.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="order-1 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>
              The latest movement across internships you have already applied
              to.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-full">
            {dashboard.recentApplications.length === 0 ? (
              <Empty className="h-full min-h-64 border border-dashed bg-muted/30">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BriefcaseBusinessIcon />
                  </EmptyMedia>
                  <EmptyTitle>No applications yet</EmptyTitle>
                  <EmptyDescription>
                    Start applying to internships and this space will turn into
                    your live progress tracker.
                  </EmptyDescription>
                </EmptyHeader>
                <Button asChild variant="outline">
                  <Link href={"/internships" as Route}>Browse internships</Link>
                </Button>
              </Empty>
            ) : (
              <div className="space-y-3">
                {dashboard.recentApplications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {application.internship?.title ??
                            "Internship removed"}
                        </p>
                        <Badge variant={statusVariant(application.status)}>
                          {toDisplayLabel(application.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {application.internship?.company ?? "Unknown company"}
                        {application.internship?.locationType
                          ? ` Â· ${toDisplayLabel(
                              application.internship.locationType
                            )}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated{" "}
                        {DATE_TIME_FORMATTER.format(
                          new Date(application.updatedAt)
                        )}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={
                          `/candidate/applications/${application.applicationId}` as Route
                        }
                      >
                        View Detail
                        <ArrowRightIcon />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AnalyticsChartCard
          title="Application Status"
          description="A quick visual read on how your submitted applications are currently distributed."
          isEmpty={!hasPipeline}
          emptyTitle="No pipeline yet"
          emptyDescription="Apply to a role and this status chart will begin filling in automatically."
        >
          <div className="flex flex-col gap-4">
            <ChartContainer
              config={statusChartConfig}
              className="mx-auto h-72 w-full max-w-sm"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey="status" hideLabel />}
                />
                <Pie
                  data={statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={70}
                  outerRadius={104}
                  paddingAngle={4}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (
                        viewBox &&
                        "cx" in viewBox &&
                        "cy" in viewBox &&
                        typeof viewBox.cx === "number" &&
                        typeof viewBox.cy === "number"
                      ) {
                        return (
                          <g
                            transform={`translate(${viewBox.cx}, ${viewBox.cy})`}
                          >
                            <text
                              y={-20}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="mb-1! fill-foreground text-3xl font-semibold"
                            >
                              {formatWholeNumber(
                                dashboard.summary.applicationCount
                              )}
                            </text>
                            <text
                              y={10}
                              textAnchor="middle"
                              className="fill-muted-foreground text-xs"
                            >
                              Applications
                            </text>
                          </g>
                        );
                      }

                      return null;
                    }}
                  />
                </Pie>
                <ChartLegend
                  content={
                    <ChartLegendContent
                      nameKey="status"
                      className="flex-wrap"
                    />
                  }
                  verticalAlign="bottom"
                />
              </PieChart>
            </ChartContainer>
          </div>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
