"use client";

import Image from "next/image";
import Link from "next/link";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function AuthButtons({ className }: { className?: string }) {
  const isMobile = useIsMobile();
  return (
    <div className={cn("flex items-center gap-2", className)}>
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
    </div>
  );
}

export function Header() {
  return (
    <header className="border-border bg-background sticky top-0 z-40 w-full border-b">
      <nav className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-foreground hover:text-foreground/80 flex items-center gap-2 font-medium"
        >
          <Image
            src="/convex.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
          <span className="hidden sm:inline">InternQuest</span>
        </Link>

        <AuthButtons />
      </nav>
    </header>
  );
}
