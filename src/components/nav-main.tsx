"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpenIcon,
  BriefcaseIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { SidebarIcon, SidebarNavItem } from "@/components/sidebar-nav";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

function getSidebarIcon(icon: SidebarIcon) {
  switch (icon) {
    case "book-open":
      return <BookOpenIcon />;
    case "briefcase":
      return <BriefcaseIcon />;
    case "clipboard-list":
      return <ClipboardListIcon />;
    case "dashboard":
      return <LayoutDashboardIcon />;
    case "shield":
      return <ShieldIcon />;
    case "user":
      return <UserIcon />;
    case "users":
      return <UsersIcon />;
    default:
      return null;
  }
}

export function NavMain({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                className="data-active:shadow-sm-sm data-active:bg-sidebar-primary/10! data-active:text-sidebar-primary!"
                asChild
              >
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
