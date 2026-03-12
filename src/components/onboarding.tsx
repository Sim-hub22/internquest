"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { RedirectToSignIn, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { BriefcaseIcon, ChevronRight, UserIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

const roles = [
  {
    id: "candidate",
    title: "Candidate",
    description: "Looking for internship",
    icon: <UserIcon />,
  },
  {
    id: "recruiter",
    title: "Recruiter",
    description: "Hiring candidates",
    icon: <BriefcaseIcon />,
  },
];

const formSchema = z.object({
  role: z.enum(["candidate", "recruiter"]),
});

type FormSchema = z.infer<typeof formSchema>;

export function Onboarding() {
  const { user } = useUser();
  const router = useRouter();
  const completeOnboarding = useMutation(api.onboarding.complete);
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "candidate",
    },
  });

  const onSubmit = async (data: FormSchema) => {
    try {
      await completeOnboarding({ role: data.role });
      await user?.reload(); // Forces a token refresh and refreshes the User object
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    }
  };

  return (
    <>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <AuthLoading>
        <Spinner className="size-10 text-primary" />
      </AuthLoading>
      <Authenticated>
        <Card className="min-w-sm shadow-2xl">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto mb-2">
              <Image
                src="/internquest.svg"
                alt="InternQuest Logo"
                width={48}
                height={48}
              />
            </Link>
            <CardTitle className="text-xl">Onboarding</CardTitle>
            <CardDescription>
              Welcome to the InternQuest platform!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="onboarding-form" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="role"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldSet data-invalid={fieldState.invalid}>
                      <FieldLegend>What are you?</FieldLegend>
                      <RadioGroup
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                        className="grid grid-cols-2"
                      >
                        {roles.map((role) => (
                          <FieldLabel key={role.id} htmlFor={`${role.id}-role`}>
                            <Field
                              orientation="horizontal"
                              data-invalid={fieldState.invalid}
                            >
                              <FieldContent className="-mr-6 flex flex-col items-center">
                                <div className="mb-2 flex aspect-square size-10 items-center justify-center rounded-full bg-input transition-colors group-has-data-checked/field:bg-primary group-has-data-checked/field:text-primary-foreground">
                                  {role.icon}
                                </div>
                                <FieldTitle>{role.title}</FieldTitle>
                                <FieldDescription>
                                  {role.description}
                                </FieldDescription>
                              </FieldContent>
                              <RadioGroupItem
                                value={role.id}
                                id={`${role.id}-role`}
                                aria-invalid={fieldState.invalid}
                              />
                            </Field>
                          </FieldLabel>
                        ))}
                      </RadioGroup>
                      <FieldDescription>
                        Please select your role to continue
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldSet>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="onboarding-form" className="w-full">
              {form.formState.isSubmitting ? (
                <Spinner />
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </Authenticated>
    </>
  );
}
