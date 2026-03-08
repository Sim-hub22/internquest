"use client";

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
  const { theme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger>
        <Toggle
          {...props}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className={cn(
            "data-[state=on]:bg-transparent data-[state=on]:hover:bg-muted",
            className
          )}
          onPressedChange={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
          pressed={theme === "dark"}
        >
          <MoonIcon
            aria-hidden="true"
            className="shrink-0 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100"
            size={16}
          />
          <SunIcon
            aria-hidden="true"
            className="absolute shrink-0 scale-100 opacity-100 transition-all dark:scale-0 dark:opacity-0"
            size={16}
          />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        Toggle theme <Kbd>D</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
