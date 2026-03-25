"use client";

import type { Route } from "next";
import Link from "next/link";

import { useConvexAuth, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ClipboardListIcon,
  Clock3Icon,
  FolderOpenIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ANALYTICS_ACCENT_COLORS,
  AnalyticsChartCard,
  AnalyticsMetricCard,
  formatWholeNumber,
} from "@/components/analytics/analytics-primitives";
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

const LISTING_REACH_CONFIG = {
  views: {
    label: "Views",
    color: ANALYTICS_ACCENT_COLORS.amber,
  },
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.teal,
  },
} as const;

const APPLICATION_TREND_CONFIG = {
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.coral,
  },
} as const;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

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

function getAttentionNote(item: {
  status: "draft" | "open" | "closed";
  applicationDeadline: number;
  applicationCount: number;
}) {
  if (item.status === "draft") {
    return "Draft listing - finish the details and publish it when you are ready.";
  }

  const daysUntilDeadline = Math.ceil(
    (item.applicationDeadline - Date.now()) / (24 * 60 * 60 * 1000)
  );

  if (daysUntilDeadline < 0) {
    return `${formatWholeNumber(
      item.applicationCount
    )} applications - deadline has already passed.`;
  }

  if (daysUntilDeadline === 0) {
    return `${formatWholeNumber(
      item.applicationCount
    )} applications - deadline closes today.`;
  }

  return `${formatWholeNumber(
    item.applicationCount
  )} applications - deadline closes in ${daysUntilDeadline} day${
    daysUntilDeadline === 1 ? "" : "s"
  }.`;
}

export function RecruiterDashboardPageContent() {
  const { isAuthenticated } = useConvexAuth();
  const overview = useQuery(
    api.analytics.getRecruiterDashboardOverview,
    isAuthenticated ? {} : "skip"
  );
  const analytics = useQuery(
    api.analytics.getRecruiterAnalyticsDashboard,
    isAuthenticated ? {} : "skip"
  );

  if (overview === undefined || analytics === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-120" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`recruiter-dashboard-metric-${index}`}
              className="h-40"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <Skeleton className="h-104" />
          <Skeleton className="h-104" />
        </div>
      </div>
    );
  }

  const hasContent =
    overview.summary.openListings > 0 ||
    overview.summary.draftListings > 0 ||
    overview.summary.totalApplications > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Recruiter Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Use this workspace to keep listings moving, stay on top of incoming
            applications, and catch quizzes that still need recruiter review.
          </p>
        </div>

        <Empty className="min-h-112 border-border/70 bg-linear-to-br from-background via-background to-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseBusinessIcon />
            </EmptyMedia>
            <EmptyTitle>No recruiter activity yet</EmptyTitle>
            <EmptyDescription>
              Create your first internship listing to start building a pipeline.
              Once applications arrive, this page will turn into your daily
              operating dashboard.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={"/recruiter/internships/new" as Route}>
                <PlusIcon />
                Create Internship
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/recruiter/internships" as Route}>
                View Listings
              </Link>
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Recruiter Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Start here each day to see which listings are live, which
            applications arrived most recently, and what still needs your
            attention.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={"/recruiter/internships/new" as Route}>
              <PlusIcon />
              New Internship
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={"/recruiter/internships" as Route}>View Listings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Open Listings"
          value={formatWholeNumber(overview.summary.openListings)}
          description="Listings currently visible to candidates and collecting interest."
          icon={FolderOpenIcon}
        />
        <AnalyticsMetricCard
          title="Draft Listings"
          value={formatWholeNumber(overview.summary.draftListings)}
          description="Work-in-progress postings that still need a publish pass."
          icon={BriefcaseBusinessIcon}
        />
        <AnalyticsMetricCard
          title="Applications"
          value={formatWholeNumber(overview.summary.totalApplications)}
          description="Total candidate submissions across your current portfolio."
          icon={UsersIcon}
        />
        <AnalyticsMetricCard
          title="Pending Quiz Review"
          value={formatWholeNumber(overview.summary.pendingQuizReviews)}
          description="Submitted quiz attempts still waiting on recruiter grading."
          icon={ClipboardListIcon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsChartCard
          title="Listing reach"
          description="A quick comparison of which internships are drawing attention and converting that reach into applications."
          isEmpty={analytics.topPerformingInternships.every(
            (entry) => entry.views === 0 && entry.applications === 0
          )}
          emptyTitle="No listing activity yet"
          emptyDescription="Views and applications will start charting here once candidates begin discovering your roles."
        >
          <ChartContainer config={LISTING_REACH_CONFIG} className="h-80 w-full">
            <BarChart
              data={analytics.topPerformingInternships}
              layout="vertical"
              margin={{ left: 12, right: 16 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="title"
                width={128}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="views" fill="var(--color-views)" radius={8} />
              <Bar
                dataKey="applications"
                fill="var(--color-applications)"
                radius={8}
              />
            </BarChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Application trend"
          description="Daily application momentum across the last 30 days so you can spot surges and slowdowns at a glance."
          isEmpty={analytics.applicationTrend.every(
            (entry) => entry.applications === 0
          )}
          emptyTitle="No application momentum yet"
          emptyDescription="As candidates start applying, this chart will reveal whether interest is steady or clustered around specific days."
        >
          <ChartContainer
            config={APPLICATION_TREND_CONFIG}
            className="h-80 w-full"
          >
            <AreaChart data={analytics.applicationTrend}>
              <defs>
                <linearGradient
                  id="recruiter-dashboard-applications-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="applications" />}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="var(--color-applications)"
                strokeWidth={3}
                fill="url(#recruiter-dashboard-applications-fill)"
              />
            </AreaChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>
              Jump straight into the newest candidates without hunting through
              each listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentApplications.length === 0 ? (
              <Empty className="min-h-56 border-border/70 bg-muted/15">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>No applications yet</EmptyTitle>
                  <EmptyDescription>
                    New candidates will appear here as soon as they apply.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                {overview.recentApplications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {application.candidateName}
                        </p>
                        <Badge variant="outline">
                          {toDisplayLabel(application.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Applied to {application.internshipTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {DATE_TIME_FORMATTER.format(
                          new Date(application.appliedAt)
                        )}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={
                          `/recruiter/internships/${application.internshipId}/applications/${application.applicationId}` as Route
                        }
                      >
                        Open Review
                        <ArrowRightIcon />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Draft listings and close deadlines are collected here so nothing
              slips out of view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.listingsNeedingAttention.length === 0 ? (
              <Empty className="min-h-56 border-border/70 bg-muted/15">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Clock3Icon />
                  </EmptyMedia>
                  <EmptyTitle>Everything looks calm</EmptyTitle>
                  <EmptyDescription>
                    Draft listings and near-term deadlines will surface here
                    automatically.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                {overview.listingsNeedingAttention.map((item) => {
                  const href =
                    item.status === "draft"
                      ? (`/recruiter/internships/${item.internshipId}/edit` as Route)
                      : (`/recruiter/internships/${item.internshipId}/applications` as Route);

                  return (
                    <div
                      key={item.internshipId}
                      className="rounded-2xl border border-border/70 bg-muted/10 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            <Badge
                              variant={
                                item.status === "draft"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {toDisplayLabel(item.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getAttentionNote(item)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Deadline{" "}
                            {DATE_FORMATTER.format(
                              new Date(item.applicationDeadline)
                            )}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={href}>
                            {item.status === "draft"
                              ? "Finish Listing"
                              : "Review Applicants"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
