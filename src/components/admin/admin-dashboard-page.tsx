"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  BriefcaseBusinessIcon,
  ClipboardListIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import {
  AnalyticsChartCard,
  AnalyticsMetricCard,
  formatWholeNumber,
} from "@/components/analytics/analytics-primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const TREND_CONFIG = {
  applications: {
    label: "Applications",
    color: "hsl(176 58% 39%)",
  },
  internships: {
    label: "Internships",
    color: "hsl(12 82% 58%)",
  },
} as const;

const ROLE_CONFIG = {
  count: {
    label: "Users",
    color: "hsl(221 50% 26%)",
  },
} as const;

const ROLE_BAR_COLORS: Record<string, string> = {
  candidate: "hsl(221 50% 36%)",
  recruiter: "hsl(176 58% 39%)",
  admin: "hsl(12 82% 58%)",
};

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium">
              {formatWholeNumber(item.count)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const dashboard = useQuery(
    api.admin.getDashboard,
    isAuthenticated ? {} : "skip"
  );

  if (dashboard === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`admin-dashboard-metric-${index}`}
              className="h-40"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[26rem]" />
          <Skeleton className="h-[26rem]" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Monitor platform health, watch intake trends, and keep an eye on the
          moderation queue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          title="Total Users"
          value={formatWholeNumber(dashboard.summary.totalUsers)}
          description={`${formatWholeNumber(dashboard.summary.suspendedUsers)} suspended accounts currently need attention.`}
          icon={UsersIcon}
        />
        <AnalyticsMetricCard
          title="Internships"
          value={formatWholeNumber(dashboard.summary.totalInternships)}
          description={`${formatWholeNumber(dashboard.summary.newInternshipsThisWeek)} new listings created in the last 7 days.`}
          icon={BriefcaseBusinessIcon}
        />
        <AnalyticsMetricCard
          title="Applications"
          value={formatWholeNumber(dashboard.summary.totalApplications)}
          description={`${formatWholeNumber(dashboard.summary.newApplicationsThisWeek)} applications arrived over the last 7 days.`}
          icon={ClipboardListIcon}
        />
        <AnalyticsMetricCard
          title="Pending Reports"
          value={formatWholeNumber(dashboard.summary.pendingReports)}
          description="Reports waiting for review or moderation decisions."
          icon={ShieldAlertIcon}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <AnalyticsChartCard
          title="Weekly Intake Trend"
          description="Track new applications and internship creation volume across the last 7 days."
          isEmpty={dashboard.trend.every(
            (entry) => entry.applications === 0 && entry.internships === 0
          )}
          emptyTitle="No recent activity"
          emptyDescription="Applications and internship creation will appear here as the platform becomes active."
        >
          <ChartContainer config={TREND_CONFIG} className="h-80 w-full">
            <AreaChart data={dashboard.trend}>
              <defs>
                <linearGradient
                  id="admin-applications-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-applications)"
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={16}
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
              <Area
                type="monotone"
                dataKey="applications"
                stroke="var(--color-applications)"
                strokeWidth={3}
                fill="url(#admin-applications-fill)"
              />
              <Area
                type="monotone"
                dataKey="internships"
                stroke="var(--color-internships)"
                strokeWidth={2.5}
                fill="transparent"
              />
            </AreaChart>
          </ChartContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Users By Role"
          description="Current account distribution across the platform."
          isEmpty={dashboard.usersByRole.every((entry) => entry.count === 0)}
          emptyTitle="No users yet"
          emptyDescription="Role distribution will appear once accounts are created."
        >
          <ChartContainer config={ROLE_CONFIG} className="h-80 w-full">
            <BarChart data={dashboard.usersByRole}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={() => "Users"}
                    formatter={(value, _name, item) => (
                      <div className="flex min-w-28 items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                ROLE_BAR_COLORS[item.payload.role] ??
                                item.color ??
                                "var(--color-count)",
                            }}
                          />
                          <span className="text-muted-foreground">
                            {item.payload.label}
                          </span>
                        </div>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="count" radius={10}>
                {dashboard.usersByRole.map((entry) => (
                  <Cell
                    key={entry.role}
                    fill={ROLE_BAR_COLORS[entry.role] ?? "var(--color-count)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownList
          title="Internship Status Breakdown"
          items={dashboard.internshipsByStatus}
        />
        <BreakdownList
          title="Application Status Breakdown"
          items={dashboard.applicationsByStatus}
        />
      </div>
    </div>
  );
}
