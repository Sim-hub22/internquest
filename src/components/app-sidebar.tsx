import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

import { auth } from "@clerk/nextjs/server";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  SECONDARY_NAV,
  SidebarRole,
  getSidebarDashboardHref,
  getSidebarNavItems,
} from "@/const/sidebar-nav";

export async function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { sessionClaims } = await auth();
  const role = ((sessionClaims?.metadata as { role?: SidebarRole } | undefined)
    ?.role ?? null) as SidebarRole;

  const navItems = getSidebarNavItems(role);
  const dashboardHref = getSidebarDashboardHref(role);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={dashboardHref as Route}>
                <Image
                  src="/internquest.svg"
                  alt="InternQuest logo"
                  width={24}
                  height={24}
                  className="size-8 shrink-0"
                />
                <span className="text-base font-medium">InternQuest</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={SECONDARY_NAV} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  );
}
