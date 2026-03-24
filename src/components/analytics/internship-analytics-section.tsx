"use client";

import { useQuery } from "convex/react";
import { MousePointerClickIcon, PercentIcon, UsersIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ANALYTICS_ACCENT_COLORS,
  APPLICATION_STATUS_COLORS,
  AnalyticsChartCard,
  AnalyticsMetricCard,
  formatPercent,
  formatWholeNumber,
} from "@/components/analytics/analytics-primitives";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const VIEWS_CHART_CONFIG = {
  views: {
    label: "Views",
    color: ANALYTICS_ACCENT_COLORS.amber,
  },
} as const;

const APPLICATIONS_CHART_CONFIG = {
  applications: {
    label: "Applications",
    color: ANALYTICS_ACCENT_COLORS.teal,
  },
} as const;

export function InternshipAnalyticsSection({
  internshipId,
}: {
  internshipId: Id<"internships">;
}) {
  const analytics = useQuery(api.analytics.getInternshipAnalytics, {
    internshipId,
  });

  if (analytics === undefined) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`analytics-metric-${index}`} className="h-40" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[26rem]" />
          <Skeleton className="h-[26rem]" />
        </div>
        <Skeleton className="h-[26rem]" />
      </section>
    );
  }

  const statusBreakdown = analytics.statusBreakdown
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      ...entry,
      fill:
        APPLICATION_STATUS_COLORS[entry.status] ?? ANALYTICS_ACCENT_COLORS.plum,
    }));
  const hasViews = analytics.summary.totalViews > 0;
  const hasApplications = analytics.summary.totalApplications > 0;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsMetricCard
          title="Total Views"
          value={formatWholeNumber(analytics.summary.totalViews)}
          description="Unique hourly visits recorded for this internship."
          icon={MousePointerClickIcon}
        />
        <AnalyticsMetricCard
          title="Total Applications"
          value={formatWholeNumber(analytics.summary.totalApplications)}
          description="Every submitted application attached to this listing."
          icon={UsersIcon}
        />
        <AnalyticsMetricCard
          title="Application Rate"
          value={formatPercent(analytics.summary.applicationRate)}
          description="How often listing visits are converting into applications."
          icon={PercentIcon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsChartCard
          title="Status Breakdown"
          description="A snapshot of where current applicants sit in the pipeline."
          isEmpty={!hasApplications}
          emptyTitle="No applications yet"
          emptyDescription="As candidates apply, their latest statuses will appear here."
        >
          <ChartContainer
            config={statusBreakdown.reduce<
              Record<string, { label: string; color: string }>
            >((config, entry) => {
              config[entry.status] = {
                label: entry.label,
                color: entry.fill,
              };
              return config;
            }, {})}
            className="h-72 w-full"
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
                innerRadius={72}
                outerRadius={108}
                paddingAngle={4}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="status" />}
                verticalAlign="bottom"
              />
            </PieChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Views Over Time"
          description="Daily view activity across the last 30 days."
          isEmpty={!hasViews}
          emptyTitle="No traffic yet"
          emptyDescription="Views will begin charting here once people discover this listing."
        >
          <ChartContainer config={VIEWS_CHART_CONFIG} className="h-72 w-full">
            <LineChart data={analytics.viewsSeries}>
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
                content={<ChartTooltipContent labelKey="views" />}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="var(--color-views)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </div>

      <AnalyticsChartCard
        title="Applications Over Time"
        description="Daily application submissions across the last 30 days."
        isEmpty={!hasApplications}
        emptyTitle="No application trend yet"
        emptyDescription="Once applications arrive, this chart will show how momentum builds."
      >
        <ChartContainer
          config={APPLICATIONS_CHART_CONFIG}
          className="h-72 w-full"
        >
          <LineChart data={analytics.applicationsSeries}>
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
            <Line
              type="monotone"
              dataKey="applications"
              stroke="var(--color-applications)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </AnalyticsChartCard>
    </section>
  );
}
