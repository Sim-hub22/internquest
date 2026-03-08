"use client";

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
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  unread?: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "application-shortlisted",
    title: "Application shortlisted",
    description: "ByteBridge shortlisted you for Frontend Intern.",
    unread: true,
  },
  {
    id: "new-message",
    title: "New recruiter message",
    description: "A recruiter replied to your application.",
    unread: true,
  },
  {
    id: "profile-reminder",
    title: "Complete your profile",
    description: "Add your skills to improve internship matches.",
  },
];

function getNotificationIcon(notification: NotificationItem) {
  if (notification.id.includes("message")) {
    return <MailIcon />;
  }

  if (notification.id.includes("application")) {
    return <BriefcaseBusinessIcon />;
  }

  return <BellIcon />;
}

export function NotificationButton({
  notifications = DEFAULT_NOTIFICATIONS,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button> & {
  notifications?: NotificationItem[];
}) {
  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

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
        {notifications.length > 0 ? (
          <DropdownMenuGroup>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start gap-2 py-2"
              >
                {getNotificationIcon(notification)}
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-tight">
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {notification.description}
                  </span>
                </div>
                {notification.unread ? (
                  <span className="mt-1 size-2 rounded-full bg-primary" />
                ) : null}
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
          <DropdownMenuItem>
            <CheckCheckIcon />
            Mark all as read
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
