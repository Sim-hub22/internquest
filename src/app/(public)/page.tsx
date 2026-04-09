import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CompassIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

import { HomeHeroSearch } from "@/components/marketing/home/home-hero-search";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Find Verified Internships With More Clarity",
  description:
    "InternQuest helps students discover verified internships, apply with confidence, and track progress through a clearer hiring journey.",
};

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  swapTitleAndEyebrowStyles?: boolean;
};

type Step = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Value = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Faq = {
  question: string;
  answer: string;
};

const stats = [
  { value: "10,000+", label: "Active internships" },
  { value: "500+", label: "Verified companies" },
  { value: "50,000+", label: "Students placed" },
] as const;

const steps: Step[] = [
  {
    number: "1",
    title: "Search opportunities",
    description:
      "Browse verified listings by title, category, and fit before committing to an application.",
    icon: CompassIcon,
  },
  {
    number: "2",
    title: "Apply with your profile",
    description:
      "Submit applications through one structured flow instead of juggling scattered forms and emails.",
    icon: ClipboardListIcon,
  },
  {
    number: "3",
    title: "Show your skills",
    description:
      "Complete quizzes or screening steps that help recruiters see more than a single resume snapshot.",
    icon: BookOpenIcon,
  },
  {
    number: "4",
    title: "Track what happens next",
    description:
      "Follow your application status, shortlisting progress, and updates from one clear dashboard.",
    icon: LayoutDashboardIcon,
  },
];

const benefits: Benefit[] = [
  {
    title: "Verified opportunities",
    description:
      "Every listing is presented as part of a more trustworthy internship discovery experience.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Simple application flow",
    description:
      "Candidates and recruiters move through a cleaner, more readable workflow from the first click onward.",
    icon: BriefcaseBusinessIcon,
  },
  {
    title: "Skill-based screening",
    description:
      "Quizzes and structured evaluation help companies assess early talent with more context.",
    icon: TargetIcon,
  },
  {
    title: "Visible progress",
    description:
      "Dashboards and notifications reduce ambiguity so applicants and recruiters stay aligned.",
    icon: TrendingUpIcon,
  },
];

const values: Value[] = [
  {
    title: "Student-first clarity",
    description:
      "We design each step so candidates understand where they are, what matters next, and how to move forward.",
    icon: UsersIcon,
  },
  {
    title: "Quality over noise",
    description:
      "InternQuest favors trustworthy listings, consistent workflows, and signals that help reduce hiring friction.",
    icon: CheckCircle2Icon,
  },
  {
    title: "Growth with structure",
    description:
      "Internships should feel like meaningful early-career milestones, not a messy side path in the hiring process.",
    icon: SparklesIcon,
  },
  {
    title: "Momentum matters",
    description:
      "We want students and teams to keep moving with confidence instead of losing progress between disconnected hiring steps.",
    icon: ZapIcon,
  },
];

const faqs: Faq[] = [
  {
    question: "What is InternQuest?",
    answer:
      "InternQuest is a platform for internship discovery and early talent hiring. It brings together verified listings, structured applications, screening workflows, and clearer progress tracking.",
  },
  {
    question: "Do students need an account to browse internships?",
    answer:
      "No. Visitors can explore public internships first, then create an account when they are ready to apply or manage their progress.",
  },
  {
    question: "How does InternQuest help recruiters?",
    answer:
      "Recruiters can publish roles, review incoming applications, assign quizzes, and keep the evaluation process tied to one organized workflow.",
  },
  {
    question: "Can candidates track their application progress?",
    answer:
      "Yes. After signing in, candidates can use dashboards and notifications to stay informed about each application and any next steps.",
  },
  {
    question: "What kinds of internships can I find on InternQuest?",
    answer:
      "The platform is designed to support internship discovery across categories such as technology, business, design, marketing, finance, healthcare, and other early-career opportunities.",
  },
  {
    question: "Can recruiters screen candidates beyond the resume?",
    answer:
      "Yes. Recruiters can add structured screening steps like quizzes so evaluation feels more consistent and gives more context than a resume-only review.",
  },
  {
    question: "Is InternQuest only for students?",
    answer:
      "InternQuest is built around students and early-career candidates, but it also supports recruiters and teams who want a cleaner process for internship hiring and candidate review.",
  },
];

const marketingCardHoverClass =
  "group transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#B9CBFF] hover:shadow-[0_26px_65px_rgba(49,95,239,0.16)] dark:hover:border-[#3150A8]";

const marketingIconHoverClass =
  "transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110";

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  swapTitleAndEyebrowStyles = false,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "space-y-4",
        centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      )}
    >
      <div className="space-y-3">
        {swapTitleAndEyebrowStyles ? (
          <p className="text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            {eyebrow}
          </p>
        ) : (
          <Badge
            variant="outline"
            className="border-[#C9D8FF] bg-white/80 px-3 py-1 text-[0.68rem] tracking-[0.22em] text-[#35518F] uppercase dark:border-[#27407D] dark:bg-slate-950/70 dark:text-slate-300"
          >
            {eyebrow}
          </Badge>
        )}
        <h2
          className={cn(
            swapTitleAndEyebrowStyles
              ? "inline-flex w-fit rounded-full border border-[#C9D8FF] bg-white/80 px-4 py-1.5 text-[0.78rem] leading-none font-medium tracking-[0.28em] text-[#35518F] uppercase dark:border-[#27407D] dark:bg-slate-950/70 dark:text-slate-300"
              : "text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white",
            centered && swapTitleAndEyebrowStyles && "mx-auto"
          )}
        >
          {title}
        </h2>
        <p className="text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
          {description}
        </p>
      </div>
    </div>
  );
}

function MockupMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#F6F9FF_0%,#EDF3FF_34%,#FFFFFF_100%)] dark:bg-[linear-gradient(180deg,#08111f_0%,#0c1727_34%,#09121e_100%)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-20 h-136 bg-[radial-gradient(circle_at_top_left,rgba(20,71,230,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(63,104,239,0.12),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] mask-[linear-gradient(to_bottom,white,transparent_82%)] bg-size-[34px_34px] dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]"
      />

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="space-y-8">
          <div className="space-y-5">
            <Badge className="bg-slate-950 px-3 py-1 text-[0.72rem] tracking-[0.2em] text-white uppercase dark:bg-white dark:text-slate-950">
              Trusted internship discovery
            </Badge>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Find the right internship. Build your future with more clarity.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
                InternQuest connects students with verified internship and
                training opportunities through a cleaner path from discovery to
                application.
              </p>
            </div>
          </div>

          <HomeHeroSearch className="max-w-3xl" />

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#D8E2FF] bg-white/82 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/60"
              >
                <p className="text-2xl font-semibold text-[#1447E6] dark:text-[#5F85FF]">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-[#1447E6] px-6 text-sm text-white hover:bg-[#103CC4]"
            >
              <Link href="/internships">
                Browse Internships
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-full border-slate-200 bg-white/80 px-6 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
            >
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-6 top-8 -z-10 h-full rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(20,71,230,0.2),transparent_62%)] blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#0E1B36_0%,#0A1428_100%)] p-6 shadow-[0_28px_90px_rgba(15,23,42,0.16)] dark:border-slate-800">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <div>
                <p className="text-xs tracking-[0.22em] text-slate-300 uppercase">
                  Candidate dashboard
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Internship progress at a glance
                </p>
              </div>
              <span className="rounded-full bg-[#1447E6]/18 px-3 py-1 text-xs font-medium text-[#AFC3FF]">
                Verified flow
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Search and shortlist
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        Explore roles, compare fit, and move into applications
                        without leaving the platform.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#1447E6]/18 p-3 text-[#AFC3FF]">
                      <CompassIcon className="size-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Remote Software Engineering Intern",
                      "Product Design Intern",
                      "Growth Marketing Intern",
                    ].map((role, index) => (
                      <div
                        key={role}
                        className={cn(
                          "flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200",
                          index === 0 ? "bg-[#1447E6]/14" : "bg-white/5"
                        )}
                      >
                        <span>{role}</span>
                        <span className="text-xs text-slate-400">
                          {index === 0 ? "Matched" : "Open"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <MockupMetric
                    value="24h"
                    label="Average recruiter response"
                  />
                  <MockupMetric
                    value="92%"
                    label="Listings with clear status"
                  />
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4">
                    <p className="text-sm font-medium text-white">
                      Screening progress
                    </p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-white/6 p-3">
                        <p className="text-sm text-slate-200">
                          Resume review complete
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div className="h-2 w-[78%] rounded-full bg-[#4F7BFF]" />
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/6 p-3">
                        <p className="text-sm text-slate-200">Quiz scheduled</p>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div className="h-2 w-[56%] rounded-full bg-[#1447E6]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#1447E6]/18 p-3 text-[#AFC3FF]">
                      <CheckCircle2Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">
                        Application sent
                      </p>
                      <p className="text-sm text-slate-300">
                        Google - SWE Intern
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs tracking-[0.2em] text-slate-300 uppercase">
                    Status visible
                  </div>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -bottom-16 size-48 rounded-full bg-[#315FEF]/16 blur-3xl"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading
          eyebrow="How it works"
          title="Get started in four simple steps"
          description="The homepage experience is designed to feel immediate and trustworthy, while the product keeps the rest of the journey organized."
          align="center"
          swapTitleAndEyebrowStyles
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <Card
                key={step.number}
                className={cn(
                  "rounded-[1.75rem] border border-slate-200 bg-white/85 py-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/65",
                  marketingCardHoverClass
                )}
              >
                <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
                  <div className="relative inline-flex">
                    <span
                      className={cn(
                        "inline-flex size-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1447E6,#3A66F0)] text-white shadow-lg shadow-[#1447E6]/25",
                        marketingIconHoverClass
                      )}
                    >
                      <Icon className="size-7" />
                    </span>
                    <span className="absolute -top-1 -right-1 inline-flex size-8 items-center justify-center rounded-full bg-[#1447E6] text-sm font-semibold text-white ring-4 ring-white transition-transform duration-300 ease-out group-hover:scale-110 dark:ring-slate-950">
                      {step.number}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-slate-950 dark:text-white">
                      {step.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading
          eyebrow="Why choose InternQuest"
          title="A platform built with student success in mind"
          description="InternQuest focuses on the details that make internship journeys feel reliable: verified listings, readable workflows, and better visibility for everyone involved."
          align="center"
          swapTitleAndEyebrowStyles
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <Card
                key={benefit.title}
                className={cn(
                  "rounded-[1.75rem] border border-slate-200 bg-white/88 py-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/65",
                  marketingCardHoverClass
                )}
              >
                <CardHeader className="gap-4 px-5 pt-6 text-center">
                  <span
                    className={cn(
                      "mx-auto inline-flex size-14 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,rgba(20,71,230,0.12),rgba(88,122,245,0.16))] text-[#1447E6] ring-1 ring-[#D8E2FF] dark:text-[#8FADFF] dark:ring-slate-700",
                      marketingIconHoverClass
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-slate-950 dark:text-white">
                      {benefit.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {benefit.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="space-y-5">
            <Badge
              variant="outline"
              className="border-[#C9D8FF] bg-white/80 px-3 py-1 text-[0.68rem] tracking-[0.22em] text-[#35518F] uppercase dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300"
            >
              About InternQuest
            </Badge>
            <h2 className="max-w-xl text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              A dedicated platform that bridges students with verified
              opportunities.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              InternQuest exists to make early-career opportunity discovery feel
              more transparent, more structured, and more encouraging for both
              candidates and recruiters.
            </p>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Instead of scattering internship workflows across disconnected
              tools, the platform keeps discovery, application, screening, and
              progress tracking inside one consistent experience.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-[1.75rem] border border-slate-200 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/65",
                  marketingCardHoverClass
                )}
              >
                <p className="text-4xl font-semibold tracking-tight text-[#1447E6] dark:text-[#8FADFF]">
                  500+
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Partner companies across technology, design, business, and
                  more.
                </p>
              </div>
              <div
                className={cn(
                  "rounded-[1.75rem] border border-slate-200 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/65",
                  marketingCardHoverClass
                )}
              >
                <p className="text-4xl font-semibold tracking-tight text-[#355FEA] dark:text-[#9AB4FF]">
                  50K+
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Students supported through a clearer internship journey.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,243,255,0.98))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(12,23,39,0.96))]">
            <div className="grid gap-4">
              <div
                className={cn(
                  "group flex items-center gap-4 rounded-[1.5rem] border border-[#D8E2FF] bg-white/88 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#B9CBFF] hover:shadow-[0_20px_45px_rgba(49,95,239,0.14)] dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-[#3150A8]"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl bg-[#E8F0FF] p-3 text-[#1447E6] dark:bg-[#11224A] dark:text-[#8FADFF]",
                    marketingIconHoverClass
                  )}
                >
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">
                    Verified first
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Trust is built into the browsing experience from the start.
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "group flex items-center gap-4 rounded-[1.5rem] border border-[#D8E2FF] bg-white/88 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#B9CBFF] hover:shadow-[0_20px_45px_rgba(49,95,239,0.14)] dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-[#3150A8]"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl bg-[#E8F0FF] p-3 text-[#1447E6] dark:bg-[#11224A] dark:text-[#8FADFF]",
                    marketingIconHoverClass
                  )}
                >
                  <Building2Icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-950 dark:text-white">
                    Structured for recruiters
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Companies can evaluate early talent with better context and
                    fewer handoff gaps.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#233D7B] hover:shadow-[0_24px_55px_rgba(2,6,23,0.28)] dark:border-slate-700 dark:hover:border-[#3150A8]">
                <p className="text-xs tracking-[0.22em] text-slate-300 uppercase">
                  Mission in practice
                </p>
                <p className="mt-3 text-lg leading-8 text-slate-100">
                  Help students discover better-fit opportunities, help
                  recruiters review more fairly, and make every step easier to
                  follow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading
          eyebrow="Core values"
          title="Principles that shape the product"
          description="Our homepage may be simple, but it reflects the same product values we want users to feel throughout the platform."
          align="center"
          swapTitleAndEyebrowStyles
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <Card
                key={value.title}
                className={cn(
                  "rounded-[1.75rem] border border-slate-200 bg-white/88 py-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/65",
                  marketingCardHoverClass
                )}
              >
                <CardHeader className="gap-4 px-5 pt-6">
                  <span
                    className={cn(
                      "inline-flex size-12 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,rgba(20,71,230,0.14),rgba(88,122,245,0.18))] text-[#1447E6] ring-1 ring-[#D8E2FF] dark:text-[#8FADFF] dark:ring-slate-700",
                      marketingIconHoverClass
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-xl text-slate-950 dark:text-white">
                    {value.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Frequently asked questions"
          title="Everything you need to know about InternQuest"
          description="A quick guide for first-time visitors, students exploring internships, and teams evaluating the platform."
          align="center"
          swapTitleAndEyebrowStyles
        />

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6 dark:border-slate-800 dark:bg-slate-950/70">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
                className="border-slate-200 px-2 dark:border-slate-800"
              >
                <AccordionTrigger className="py-5 text-left text-base leading-7 text-slate-950 dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-8 text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#101828] backdrop-blur">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))] lg:px-8">
          <div className="space-y-4">
            <Link
              href="/"
              className="flex w-fit items-center gap-3 font-medium text-white"
            >
              <Image
                src="/internquest.svg"
                alt="InternQuest logo"
                width={28}
                height={28}
                className="size-7"
              />
              <span className="text-lg">InternQuest</span>
            </Link>
            <p className="max-w-md text-sm leading-7 text-slate-300">
              Verified internship discovery, clearer applications, and a more
              organized early-talent journey for students and recruiters.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold tracking-[0.16em] text-white uppercase">
              Explore
            </p>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <Link href="/internships" className="hover:text-white">
                Internships
              </Link>
              <Link href="/resources" className="hover:text-white">
                Resources
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold tracking-[0.16em] text-white uppercase">
              Get started
            </p>
            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <Link href="/sign-up" className="hover:text-white">
                Create account
              </Link>
              <Link href="/sign-in" className="hover:text-white">
                Sign in
              </Link>
              <Link href="/internships" className="hover:text-white">
                Browse roles
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-slate-400">
          <p>
            (c) 2026 InternQuest. Built to make early-career opportunities more
            visible and more trustworthy.
          </p>
        </div>
      </footer>
    </main>
  );
}
