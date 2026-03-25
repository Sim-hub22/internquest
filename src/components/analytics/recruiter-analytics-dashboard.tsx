"use client";

import type { Route } from "next";
import Link from "next/link";

import { useConvexAuth, useQuery } from "convex/react";
import {
  MousePointerClickIcon,
  PercentIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ANALYTICS_ACCENT_COLORS,
  AnalyticsChartCard,
  AnalyticsMetricCard,
  formatPercent,
  formatWholeNumber,
} from "@/components/analytics/analytics-primitives";
import { Button } from "@/components/ui/button";
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

const TOP_PERFORMERS_CONFIG = {
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.coral,
  },
} as const;

const APPLICATION_TREND_CONFIG = {
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.teal,
  },
} as const;

const CATEGORY_PERFORMANCE_CONFIG = {
  views: {
    label: "Views",
    color: ANALYTICS_ACCENT_COLORS.amber,
  },
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.navy,
  },
} as const;

const FUNNEL_COLORS = [
  ANALYTICS_ACCENT_COLORS.amber,
  ANALYTICS_ACCENT_COLORS.coral,
  ANALYTICS_ACCENT_COLORS.teal,
  ANALYTICS_ACCENT_COLORS.gold,
];

export function RecruiterAnalyticsDashboard({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const analytics = useQuery(
    api.analytics.getRecruiterAnalyticsDashboard,
    isAuthenticated ? {} : "skip"
  );

  if (analytics === undefined) {
    return (
      <div
        className={
          embedded
            ? "flex flex-col gap-6"
            : "flex flex-1 flex-col gap-6 p-4 lg:p-6"
        }
      >
        {!embedded ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-[28rem]" />
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`dashboard-metric-${index}`} className="h-40" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
      </div>
    );
  }

  const hasListings = analytics.topPerformingInternships.length > 0;

  if (!hasListings) {
    if (embedded) {
      return null;
    }

    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Recruiter Analytics
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Once your listings are live, this dashboard will help you compare
            performance, track conversion quality, and spot where candidates
            drop off.
          </p>
        </div>

        <Empty className="min-h-[28rem] border-border/70 bg-gradient-to-br from-background via-background to-muted/25">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrendingUpIcon />
            </EmptyMedia>
            <EmptyTitle>No analytics yet</EmptyTitle>
            <EmptyDescription>
              Create your first internship listing to start collecting views,
              applications, and pipeline conversion data.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={"/recruiter/internships/new" as Route}>
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

  const funnelData = analytics.conversionFunnel.map((entry, index) => ({
    ...entry,
    fill: FUNNEL_COLORS[index] ?? ANALYTICS_ACCENT_COLORS.plum,
  }));

  return (
    <div
      className={
        embedded
          ? "flex flex-col gap-6"
          : "flex flex-1 flex-col gap-6 p-4 lg:p-6"
      }
    >
      {embedded ? (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Performance snapshot
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Keep the daily action view and the bigger recruiting trend lines in
            the same place.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Recruiter Analytics
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Compare listing performance, monitor application momentum, and see
              how effectively views move through your pipeline.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={"/recruiter/internships" as Route}>
              Back to Listings
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsMetricCard
          title="Total Views"
          value={formatWholeNumber(analytics.summary.totalViews)}
          description="Unique hourly visits across all of your listings."
          icon={MousePointerClickIcon}
        />
        <AnalyticsMetricCard
          title="Total Applications"
          value={formatWholeNumber(analytics.summary.totalApplications)}
          description="Combined application submissions across your portfolio."
          icon={UsersIcon}
        />
        <AnalyticsMetricCard
          title="Acceptance Rate"
          value={formatPercent(analytics.summary.acceptanceRate)}
          description="The share of applications that have ever reached acceptance."
          icon={PercentIcon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsChartCard
          title="Top Performing Internships"
          description="Listings ranked by application volume, with application rate as the tie-breaker."
          isEmpty={analytics.topPerformingInternships.length === 0}
          emptyTitle="No listing performance yet"
          emptyDescription="Your highest-performing internships will appear here after they start collecting applications."
        >
          <ChartContainer
            config={TOP_PERFORMERS_CONFIG}
            className="h-80 w-full"
          >
            <BarChart
              data={analytics.topPerformingInternships}
              layout="vertical"
              margin={{ left: 12, right: 18 }}
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
                width={120}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="applications" />}
              />
              <Bar
                dataKey="applications"
                fill="var(--color-applications)"
                radius={10}
              >
                <LabelList
                  dataKey="applications"
                  position="right"
                  className="fill-foreground text-xs"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Application Trend"
          description="Daily application volume across the last 30 days."
          isEmpty={analytics.applicationTrend.every(
            (entry) => entry.applications === 0
          )}
          emptyTitle="No recent applications"
          emptyDescription="When candidates start applying, this chart will reveal your momentum."
        >
          <ChartContainer
            config={APPLICATION_TREND_CONFIG}
            className="h-80 w-full"
          >
            <AreaChart data={analytics.applicationTrend}>
              <defs>
                <linearGradient
                  id="applications-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.32}
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
                fill="url(#applications-fill)"
              />
            </AreaChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsChartCard
          title="Category Performance"
          description="A side-by-side comparison of visibility and application demand by category."
          isEmpty={analytics.categoryPerformance.every(
            (entry) => entry.views === 0 && entry.applications === 0
          )}
          emptyTitle="No category data yet"
          emptyDescription="Once listings collect traffic and applications, you’ll be able to compare category strength here."
        >
          <ChartContainer
            config={CATEGORY_PERFORMANCE_CONFIG}
            className="h-80 w-full"
          >
            <BarChart data={analytics.categoryPerformance}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={12}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
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
          title="Conversion Funnel"
          description="Milestone history showing how attention moves from views to accepted candidates."
          isEmpty={analytics.summary.totalViews === 0}
          emptyTitle="No funnel data yet"
          emptyDescription="Once your internships begin receiving traffic, this funnel will show where conversion strengthens or stalls."
        >
          <ChartContainer
            config={funnelData.reduce<
              Record<string, { label: string; color: string }>
            >((config, entry) => {
              config[entry.stage] = {
                label: entry.stage,
                color: entry.fill,
              };
              return config;
            }, {})}
            className="h-80 w-full"
          >
            <FunnelChart>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Funnel
                dataKey="count"
                data={funnelData}
                isAnimationActive={false}
              >
                <LabelList
                  position="right"
                  fill="hsl(var(--foreground))"
                  stroke="none"
                  dataKey="stage"
                />
                <LabelList
                  position="center"
                  fill="hsl(var(--background))"
                  stroke="none"
                  dataKey="count"
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return formatWholeNumber(value);
                    }

                    if (value == null) {
                      return "";
                    }

                    const numericValue = Number(value);

                    return Number.isFinite(numericValue)
                      ? formatWholeNumber(numericValue)
                      : "";
                  }}
                />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        Category bars compare views and applications directly. Acceptance is
        still factored into the dashboard through the summary rate and the
        funnel, while each category retains its own acceptance-rate value in the
        underlying data.
      </div>
    </div>
  );
}
