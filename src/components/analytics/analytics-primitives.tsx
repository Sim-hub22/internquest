"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const WHOLE_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export const ANALYTICS_ACCENT_COLORS = {
  amber: "hsl(37 92% 50%)",
  teal: "hsl(176 58% 39%)",
  coral: "hsl(12 82% 58%)",
  navy: "hsl(221 50% 26%)",
  sage: "hsl(146 26% 44%)",
  rose: "hsl(350 70% 61%)",
  gold: "hsl(43 90% 55%)",
  plum: "hsl(330 42% 47%)",
} as const;

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  applied: ANALYTICS_ACCENT_COLORS.amber,
  under_review: ANALYTICS_ACCENT_COLORS.teal,
  shortlisted: ANALYTICS_ACCENT_COLORS.coral,
  quiz_assigned: ANALYTICS_ACCENT_COLORS.navy,
  quiz_completed: ANALYTICS_ACCENT_COLORS.sage,
  accepted: ANALYTICS_ACCENT_COLORS.gold,
  rejected: ANALYTICS_ACCENT_COLORS.rose,
};

export function formatWholeNumber(value: number) {
  return WHOLE_NUMBER_FORMATTER.format(value);
}

export function formatPercent(value: number) {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

export function AnalyticsMetricCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/70", className)}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {title}
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {value}
            </CardTitle>
          </div>
          <div className="rounded-full border border-border/70 bg-muted/30 p-2 text-muted-foreground shadow-sm">
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardHeader>
    </Card>
  );
}

export function AnalyticsChartCard({
  title,
  description,
  isEmpty,
  emptyTitle,
  emptyDescription,
  children,
  className,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/70", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <Empty className="min-h-72 rounded-2xl border-border/70 bg-muted/15">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3Icon />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
