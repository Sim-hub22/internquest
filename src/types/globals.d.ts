export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean;
      role?: "candidate" | "recruiter" | "admin";
    };
    firstName?: string;
  }
}
