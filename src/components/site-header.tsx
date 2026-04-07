"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated } from "convex/react";

import { ModeToggle } from "@/components/mode-toggle";
import { NotificationButton } from "@/components/notification-button";
import { buildSiteHeaderBreadcrumbs } from "@/components/site-header-breadcrumbs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeader() {
  const pathname = usePathname();
  const breadcrumbs = buildSiteHeaderBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background! px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </div>
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => {
              return (
                <Fragment key={breadcrumb.href}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {breadcrumb.isCurrent ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumb.href as Route}>
                          {breadcrumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        <NotificationButton />
        <div>
          <Separator
            orientation="vertical"
            className="mx-1 data-[orientation=vertical]:h-4"
          />
        </div>
        <ModeToggle size="sm" />
        <div>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </div>
        <AuthLoading>
          <Skeleton className="aspect-square size-7 rounded-full" />
        </AuthLoading>
        <Authenticated>
          <UserButton
            fallback={
              <Skeleton className="aspect-square size-7 rounded-full" />
            }
          />
        </Authenticated>
      </div>
    </header>
  );
}
