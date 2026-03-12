"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { BellIcon, Settings2Icon } from "lucide-react";

import { SidebarIcon, SidebarNavItem } from "@/components/sidebar-nav";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

function getSidebarIcon(icon: SidebarIcon) {
  switch (icon) {
    case "bell":
      return <BellIcon />;
    case "settings":
      return <Settings2Icon />;
    default:
      return null;
  }
}

export function NavSecondary({
  items,
  ...props
}: {
  items: SidebarNavItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={pathname === item.url} asChild>
                <Link href={item.url}>
                  {getSidebarIcon(item.icon)}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
