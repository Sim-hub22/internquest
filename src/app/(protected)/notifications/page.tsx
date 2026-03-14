"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useMutation, useQuery } from "convex/react";
import {
  BellIcon,
  BriefcaseBusinessIcon,
  CheckCheckIcon,
  MailIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const NOTIFICATION_TYPES = [
  "application_status",
  "quiz_assigned",
  "quiz_graded",
  "new_internship",
  "new_application",
  "new_resource",
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;

  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 7) {
    return `${days}d ago`;
  }

  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getNotificationIcon(notification: Doc<"notifications">) {
  switch (notification.type) {
    case "new_application":
    case "application_status":
      return <BriefcaseBusinessIcon className="size-4" />;
    case "quiz_assigned":
    case "quiz_graded":
      return <MailIcon className="size-4" />;
    default:
      return <BellIcon className="size-4" />;
  }
}

export default function NotificationsPage() {
  const [scope, setScope] = useState<"all" | "unread">("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);

  const resetPagination = () => {
    setCursor(null);
    setCursorHistory([]);
  };

  const results = useQuery(api.notifications.list, {
    paginationOpts: {
      numItems: PAGE_SIZE,
      cursor,
    },
    unreadOnly: scope === "unread" ? true : undefined,
    type: type === "all" ? undefined : type,
  });
  const unreadCount = useQuery(api.notifications.unreadCount, {});
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAsRead = (notification: Doc<"notifications">) => {
    if (notification.isRead) {
      return;
    }

    void markAsRead({ notificationId: notification._id });
  };

  const handleMarkAllAsRead = () => {
    void markAllAsRead();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground">
            Keep track of updates across your applications and internships.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleMarkAllAsRead}
          disabled={!unreadCount}
        >
          <CheckCheckIcon />
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={scope}
          onValueChange={(value) => {
            setScope(value as "all" | "unread");
            resetPagination();
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as NotificationType | "all");
            resetPagination();
          }}
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {NOTIFICATION_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {toDisplayLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {results === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={`notification-skeleton-${index}`}
              className="h-28 w-full"
            />
          ))}
        </div>
      ) : results.page.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              New updates will appear here as you interact with the platform.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="space-y-3">
            {results.page.map((notification) => {
              const isLink = !!notification.link;

              const content = (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary p-2 text-primary-foreground">
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        notification.isRead
                          ? "text-muted-foreground"
                          : "font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead ? (
                    <span
                      className="mt-1 size-2 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </div>
              );

              return (
                <Card key={notification._id}>
                  <CardContent>
                    {isLink ? (
                      <Link
                        href={notification.link as Route}
                        className="block"
                        aria-label={notification.title}
                        onClick={() => handleMarkAsRead(notification)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        aria-label={notification.title}
                        onClick={() => handleMarkAsRead(notification)}
                      >
                        {content}
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setCursorHistory((previous) => {
                      const next = [...previous];
                      const previousCursor = next.pop() ?? null;
                      setCursor(previousCursor);
                      return next;
                    });
                  }}
                  aria-disabled={cursorHistory.length === 0}
                  className={
                    cursorHistory.length === 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();

                    if (!results.continueCursor || results.isDone) {
                      return;
                    }

                    setCursorHistory((previous) => [...previous, cursor]);
                    setCursor(results.continueCursor);
                  }}
                  aria-disabled={results.isDone}
                  className={
                    results.isDone ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
}
