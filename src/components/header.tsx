"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
  { href: "#", label: "About" },
  { href: "#", label: "Contact" },
] as const;

export function Header() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  return (
    <header className="border-border bg-background sticky top-0 z-40 w-full border-b">
      <nav className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-foreground hover:text-foreground/80 flex items-center gap-2 font-medium"
        >
          <Image
            src="/internquest.svg"
            alt="InternQuest Logo"
            width={24}
            height={24}
            className={cn("size-7.5", isMobile && "size-6.5")}
          />
          <span className="hidden sm:inline">InternQuest</span>
        </Link>

        <NavigationMenu>
          <NavigationMenuList className="gap-2">
            {NAV_LINKS.map(({ href, label }, idx) => (
              <NavigationMenuItem key={`nav-link-${idx}`}>
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    buttonVariants({ size: "default", variant: "ghost" })
                  )}
                  active={pathname === href}
                >
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size={isMobile ? "sm" : "default"}>
            Sign In
          </Button>
          <Button variant="default" size={isMobile ? "sm" : "default"}>
            Sign Up
          </Button>
        </div>
      </nav>
    </header>
  );
}
