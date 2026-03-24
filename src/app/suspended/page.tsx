import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SuspendedPage() {
  const { userId, sessionClaims } = await auth();
  const isSuspended = sessionClaims?.metadata?.isSuspended === true;
  const role = sessionClaims?.metadata?.role as string | undefined;

  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!isSuspended || role === "admin") {
    redirect("/dashboard" as Route);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-border/70 bg-gradient-to-br from-background via-background to-muted/30">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl tracking-tight">
            Account Suspended
          </CardTitle>
          <CardDescription>
            Your access to protected areas of InternQuest has been suspended by
            an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can still return to the public homepage, but protected dashboard
            features and authenticated actions are currently unavailable.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={"/" as Route}>Go to homepage</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={"/sign-in" as Route}>Switch account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
