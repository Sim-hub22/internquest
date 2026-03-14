"use client";

import type { Route } from "next";
import Link from "next/link";

import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { calculateProfileCompleteness } from "@/lib/profile-completeness";

export default function CandidateDashboardPage() {
  const profile = useQuery(api.candidateProfiles.current, {});
  const completeness =
    profile === undefined ? undefined : calculateProfileCompleteness(profile);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Candidate Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome! Track your progress and stay application-ready.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile completeness</CardTitle>
          <CardDescription>
            A complete profile improves your chances when recruiters review
            applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile === undefined ? (
            <>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-40" />
            </>
          ) : (
            <>
              <Progress value={completeness} />
              <p className="text-sm text-muted-foreground">
                {completeness}% complete
              </p>
            </>
          )}

          <Button asChild variant="outline">
            <Link href={"/candidate/profile/edit" as Route}>
              Update Profile
            </Link>
          </Button>
        </CardContent>
      </Card>

      {completeness !== undefined && completeness < 100 ? (
        <Card>
          <CardHeader>
            <CardTitle>Need a faster setup?</CardTitle>
            <CardDescription>
              Use the guided 5-step wizard to complete your profile quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href={"/candidate/profile/wizard" as Route}>
                Start Profile Wizard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/candidate/profile/edit" as Route}>
                Continue In Full Editor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
