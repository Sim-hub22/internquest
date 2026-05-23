"use client";

import * as React from "react";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { env } from "@/env";
import { cn } from "@/lib/utils";

const afterSignUpUrl = env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL;
const signInUrl = env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;

type FieldError = {
  message?: string;
} | null;

export function CustomSignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] =
    React.useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const hasFinalized = React.useRef(false);

  const isFetching = fetchStatus === "fetching";
  const isSsoCallback = pathname?.includes("sso-callback");
  const needsEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const finalizeSignUp = React.useCallback(async () => {
    if (hasFinalized.current || signUp.status !== "complete") {
      return;
    }

    hasFinalized.current = true;
    const { error } = await signUp.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          return;
        }

        const url = decorateUrl(afterSignUpUrl);
        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }

        router.push(url as Route);
      },
    });

    if (error) {
      hasFinalized.current = false;
      setFormError(error.message);
    }
  }, [router, signUp]);

  React.useEffect(() => {
    if (isSignedIn) {
      router.replace(afterSignUpUrl as Route);
      return;
    }

    if (signUp.status === "complete") {
      void finalizeSignUp();
    }
  }, [finalizeSignUp, isSignedIn, router, signUp.status]);

  const handleSubmit = async (formData: FormData) => {
    setFormError("");
    setConfirmPasswordError("");

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const emailAddress = String(formData.get("emailAddress") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    const { error } = await signUp.password({
      emailAddress,
      password,
      firstName,
      lastName,
      username,
    });

    if (error) {
      setFormError(error.message);
      return;
    }

    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async (formData: FormData) => {
    setFormError("");
    const code = String(formData.get("code") ?? verificationCode).trim();
    const { error } = await signUp.verifications.verifyEmailCode({ code });

    if (error) {
      setFormError(error.message);
      return;
    }

    await finalizeSignUp();
  };

  const handleGoogleSignUp = async () => {
    setFormError("");
    const { error } = await signUp.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/sign-up/sso-callback",
      redirectUrl: afterSignUpUrl,
    });

    if (error) {
      setFormError(error.message);
    }
  };

  if (isSsoCallback) {
    return (
      <AuthShell>
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="size-10 text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (needsEmailVerification) {
    return (
      <AuthShell>
        <form action={handleVerify} className="space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold">Verify your account</h1>
            <p className="text-sm text-muted-foreground">
              Enter the code sent to {signUp.emailAddress}.
            </p>
          </div>
          <Field
            error={errors.fields.code}
            id="code"
            label="Verification code"
          >
            <Input
              id="code"
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
            />
          </Field>
          <FormError message={formError} />
          <Button type="submit" className="h-10 w-full" disabled={isFetching}>
            {isFetching ? "Verifying..." : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isFetching}
            onClick={() => void signUp.verifications.sendEmailCode()}
          >
            Resend code
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Welcome! Please fill in the details to get started.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field
              error={errors.fields.firstName}
              id="firstName"
              label="First name"
            >
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                placeholder="First name"
                required
              />
            </Field>
            <Field
              error={errors.fields.lastName}
              id="lastName"
              label="Last name"
            >
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                placeholder="Last name"
                required
              />
            </Field>
          </div>

          <Field error={errors.fields.username} id="username" label="Username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="Enter your username"
              required
            />
          </Field>

          <Field
            error={errors.fields.emailAddress}
            id="emailAddress"
            label="Email address"
          >
            <Input
              id="emailAddress"
              name="emailAddress"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              required
            />
          </Field>

          <Field error={errors.fields.password} id="password" label="Password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Create a password"
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((value) => !value)}
            />
          </Field>

          <Field
            error={confirmPasswordError}
            id="confirmPassword"
            label="Confirm password"
          >
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              visible={confirmPasswordVisible}
              onToggle={() => setConfirmPasswordVisible((value) => !value)}
            />
          </Field>
        </div>

        <div id="clerk-captcha" />
        <FormError message={formError} />

        <Button type="submit" className="h-10 w-full" disabled={isFetching}>
          {isFetching ? "Creating account..." : "Continue"}
          {!isFetching && <ChevronRight className="size-4" />}
        </Button>

        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-3"
          disabled={isFetching}
          onClick={() => void handleGoogleSignUp()}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-125 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/10">
        <div className="space-y-7 px-12 py-10">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/internquest.svg"
              alt=""
              width={30}
              height={30}
              className="size-8 rounded-lg"
              priority
            />
            <span className="text-xl font-semibold">InterQuest</span>
          </div>
          {children}
        </div>
        <div className="border-t border-border bg-muted/35 px-4 py-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={signInUrl as Route} className="font-medium text-primary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode;
  error: FieldError | string;
  id: string;
  label: string;
}) {
  const message = typeof error === "string" ? error : error?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      {children}
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}

function PasswordInput({
  className,
  visible,
  onToggle,
  ...props
}: React.ComponentProps<typeof Input> & {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        required
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
