"use client";

import React from "react";

import { ClerkProvider as ClerkNextJsProvider } from "@clerk/nextjs";
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
  const mergedAppearance = {
    ...appearance,
    theme: shadcn,
    elements: {
      footerItem: {
        display: "none",
      },
      footer: {
        "& > :not(:first-child)": {
          display: "none",
        },
      },
      ...appearance?.elements,
    },
    options: {
      socialButtonsPlacement: "bottom",
      unsafe_disableDevelopmentModeWarnings: true,
      logoImageUrl:
        theme === "dark" ? "/internquest-dark.svg" : "/internquest-light.svg",
      ...appearance?.options,
    },
  } as ClerkProviderProps["appearance"];

  return (
    <ClerkNextJsProvider
      appearance={mergedAppearance}
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
