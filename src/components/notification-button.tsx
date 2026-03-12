"use client";

import type { Route } from "next";
import Link from "next/link";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  BellIcon,
  BriefcaseBusinessIcon,
  CheckCheckIcon,
  MailIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

function getNotificationIcon(notification: Doc<"notifications">) {
  switch (notification.type) {
    case "new_application":
    case "application_status":
      return <BriefcaseBusinessIcon />;
    case "quiz_assigned":
    case "quiz_graded":
      return <MailIcon />;
    default:
      return <BellIcon />;
  }
}

export function NotificationButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button>) {
  const { isAuthenticated } = useConvexAuth();
  const notifications = useQuery(
    api.notifications.listUnread,
    isAuthenticated ? {} : "skip"
  );
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markAsRead = useMutation(api.notifications.markAsRead);

  const unreadCount = notifications?.length ?? 0;

  const handleMarkAllAsRead = () => {
    void markAllAsRead();
  };

  const handleMarkAsRead = (id: Doc<"notifications">["_id"]) => {
    void markAsRead({ notificationId: id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open notifications"
          className={cn("relative", className)}
          {...props}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute top-0 right-0 z-10 inline-flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground",
                unreadCount > 9 && "text-[9px]"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {unreadCount} new
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications === undefined ? (
          <div className="flex items-center justify-center py-4">
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : notifications.length > 0 ? (
          <DropdownMenuGroup>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className="flex items-start gap-2 py-2"
                onClick={() => handleMarkAsRead(notification._id)}
                asChild={!!notification.link}
              >
                {notification.link ? (
                  <Link href={notification.link as Route}>
                    {getNotificationIcon(notification)}
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm leading-tight">
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                    </div>
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                  </Link>
                ) : (
                  <>
                    {getNotificationIcon(notification)}
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm leading-tight">
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                    </div>
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                  </>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : (
          <Empty className="rounded-none border-0 p-3">
            <EmptyHeader className="max-w-none gap-1">
              <EmptyMedia variant="icon">
                <BellIcon />
              </EmptyMedia>
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>You have no notifications.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={unreadCount === 0}
            onClick={handleMarkAllAsRead}
          >
            <CheckCheckIcon />
            Mark all as read
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
