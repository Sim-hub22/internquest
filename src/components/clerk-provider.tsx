"use client";

import React from "react";

import { ClerkProvider as ClerkNextJsProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { useTheme } from "next-themes";

type ClerkProviderProps = React.ComponentProps<typeof ClerkNextJsProvider>;

export function ClerkProvider({
  children,
  appearance,
  localization,
  ...props
}: ClerkProviderProps) {
  const { theme } = useTheme();
  return (
    <ClerkNextJsProvider
      ui={ui}
      appearance={{
        theme: shadcn,
        options: {
          socialButtonsPlacement: "bottom",
          unsafe_disableDevelopmentModeWarnings: true,
          logoImageUrl:
            theme === "dark"
              ? "/internquest-dark.svg"
              : "/internquest-light.svg",
        },
        ...appearance,
      }}
      localization={{
        formFieldInputPlaceholder__username: "Enter your username",
        ...localization,
      }}
      {...props}
    >
      {children}
    </ClerkNextJsProvider>
  );
}
