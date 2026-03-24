export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean;
      isSuspended?: boolean;
      role?: "candidate" | "recruiter" | "admin";
    };
    firstName?: string;
  }
}
