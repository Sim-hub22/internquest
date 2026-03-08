"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Kbd } from "@/components/ui/kbd";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Toggle>) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDarkMode = isClient ? resolvedTheme === "dark" : false;
  const nextTheme = isDarkMode ? "light" : "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          {...props}
          aria-label={`Switch to ${nextTheme} mode`}
          className={cn(
            "aria-pressed:bg-transparent aria-pressed:hover:bg-muted data-[state=on]:bg-transparent data-[state=on]:hover:bg-muted",
            className
          )}
          onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
          pressed={isDarkMode}
        >
          <MoonIcon
            aria-hidden="true"
            className="shrink-0 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100"
          />
          <SunIcon
            aria-hidden="true"
            className="absolute shrink-0 scale-100 opacity-100 transition-all dark:scale-0 dark:opacity-0"
          />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        Toggle theme <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
