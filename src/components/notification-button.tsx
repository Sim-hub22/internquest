"use client";

import Link from "next/link";

import { useConvexAuth, useQuery } from "convex/react";
import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export function NotificationButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button>) {
  const { isAuthenticated } = useConvexAuth();
  const unreadCount = useQuery(
    api.notifications.unreadCount,
    isAuthenticated ? {} : "skip"
  );
  const count = unreadCount ?? 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Open notifications"
      className={cn("relative", className)}
      {...props}
    >
      <Link href="/notifications" prefetch>
        <BellIcon />
        {count > 0 ? (
          <span
            className={cn(
              "absolute top-0 right-0 z-10 inline-flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground",
              count > 9 && "text-[9px]"
            )}
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
