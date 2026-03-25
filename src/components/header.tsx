"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { LayoutDashboardIcon, MenuIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/internships", label: "Internships" },
  { href: "/resources", label: "Resources" },
] as const;

export function Header() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <nav className="container mx-auto grid h-14 max-w-7xl grid-cols-2 items-center gap-3 px-4 md:grid-cols-[1fr_2fr_1fr]">
        <Link
          href="/"
          className="flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <Image
            src="/internquest.svg"
            alt="InternQuest Logo"
            width={24}
            height={24}
            className="size-7.5"
          />
          <span className="hidden sm:inline">InternQuest</span>
        </Link>

        <NavigationMenu className="mx-auto hidden md:flex">
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

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AuthLoading>
            <Skeleton className="aspect-square size-7.5 rounded-full" />
          </AuthLoading>
          <Authenticated>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={<LayoutDashboardIcon className="size-4" />}
                  href="/dashboard"
                />
              </UserButton.MenuItems>
            </UserButton>
          </Authenticated>
          <Unauthenticated>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton forceRedirectUrl="/onboarding">
              <Button variant="default">Sign Up</Button>
            </SignUpButton>
          </Unauthenticated>
        </div>

        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="ml-auto">
                <MenuIcon />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-xs sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 px-4 pb-6">
                {NAV_LINKS.map(({ href, label }, idx) => (
                  <Button
                    key={`mobile-nav-link-${idx}`}
                    className="w-full justify-start"
                    variant={pathname === href ? "secondary" : "ghost"}
                    size="lg"
                    asChild
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </div>

              <SheetFooter>
                <Authenticated>
                  <UserButton>
                    <UserButton.MenuItems>
                      <UserButton.Link
                        label="Dashboard"
                        labelIcon={<LayoutDashboardIcon className="size-4" />}
                        href="/dashboard"
                      />
                    </UserButton.MenuItems>
                  </UserButton>
                </Authenticated>
                <Unauthenticated>
                  <SignInButton>
                    <Button className="w-full" size="lg" variant="outline">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button className="w-full" size="lg">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </Unauthenticated>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </nav>
    </header>
  );
}
