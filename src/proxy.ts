import { NextResponse } from "next/server";

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/internships(.*)",
  "/resources(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding",
]);

const isCandidateRoute = createRouteMatcher(["/candidate(.*)"]);
const isRecruiterRoute = createRouteMatcher(["/recruiter(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Catch users who do not have `onboardingComplete: true` in their publicMetadata
  // Redirect them to the /onboarding route to complete onboarding
  if (
    userId &&
    !sessionClaims?.metadata?.onboardingComplete &&
    req.nextUrl.pathname !== "/onboarding"
  ) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // Role-based route protection
  if (userId && sessionClaims?.metadata?.onboardingComplete) {
    const role = sessionClaims?.metadata?.role as string | undefined;

    if (isCandidateRoute(req) && role !== "candidate") {
      const homeUrl = new URL(`/${role ?? ""}/dashboard`, req.url);
      return NextResponse.redirect(homeUrl);
    }

    if (isRecruiterRoute(req) && role !== "recruiter") {
      const homeUrl = new URL(`/${role ?? ""}/dashboard`, req.url);
      return NextResponse.redirect(homeUrl);
    }

    if (isAdminRoute(req) && role !== "admin") {
      const homeUrl = new URL(`/${role ?? ""}/dashboard`, req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // If the user is logged in and the route is protected, let them view.
  if (userId && !isPublicRoute(req)) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
