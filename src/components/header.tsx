"use client";

import Image from "next/image";
import Link from "next/link";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function Header() {
  const isMobile = useIsMobile();

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
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton>
              <Button variant="ghost" size={isMobile ? "sm" : "default"}>
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button variant="default" size={isMobile ? "sm" : "default"}>
                Sign Up
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>{" "}
      </nav>
    </header>
  );
}
