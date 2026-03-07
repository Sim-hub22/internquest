import React from "react";

import { ClerkProvider as ClerkNextJsProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

type ClerkProviderProps = React.ComponentProps<typeof ClerkNextJsProvider>;

export function ClerkProvider({
  children,
  appearance,
  localization,
  ...props
}: ClerkProviderProps) {
  return (
    <ClerkNextJsProvider
      appearance={{
        theme: shadcn,
        options: {
          socialButtonsPlacement: "bottom",
          unsafe_disableDevelopmentModeWarnings: true,
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
