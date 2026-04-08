"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import type { SiteHeaderBreadcrumbOverride } from "./site-header-breadcrumb-overrides";

type SiteHeaderBreadcrumbLabelProps = {
  fallbackLabel: string;
  override: SiteHeaderBreadcrumbOverride;
};

type BreadcrumbLabelQueryProps = {
  fallbackLabel: string;
  label: string | null | undefined;
};

function ResolvedBreadcrumbLabel({
  fallbackLabel,
  label,
}: BreadcrumbLabelQueryProps) {
  return label ?? fallbackLabel;
}

function RecruiterInternshipBreadcrumbLabel({
  fallbackLabel,
  internshipId,
}: {
  fallbackLabel: string;
  internshipId: string;
}) {
  const label = useQuery(api.internships.getRecruiterBreadcrumbLabel, {
    internshipId: internshipId as Id<"internships">,
  });

  return (
    <ResolvedBreadcrumbLabel fallbackLabel={fallbackLabel} label={label} />
  );
}

function RecruiterQuizBreadcrumbLabel({
  fallbackLabel,
  quizId,
}: {
  fallbackLabel: string;
  quizId: string;
}) {
  const label = useQuery(api.quizzes.getBreadcrumbLabel, {
    quizId: quizId as Id<"quizzes">,
  });

  return (
    <ResolvedBreadcrumbLabel fallbackLabel={fallbackLabel} label={label} />
  );
}

function AdminQuizBreadcrumbLabel({
  fallbackLabel,
  quizId,
}: {
  fallbackLabel: string;
  quizId: string;
}) {
  const label = useQuery(api.quizzes.getBreadcrumbLabel, {
    quizId: quizId as Id<"quizzes">,
  });

  return (
    <ResolvedBreadcrumbLabel fallbackLabel={fallbackLabel} label={label} />
  );
}

function CandidateQuizBreadcrumbLabel({
  applicationId,
  fallbackLabel,
  quizId,
}: {
  applicationId?: string;
  fallbackLabel: string;
  quizId: string;
}) {
  const label = useQuery(api.quizzes.getBreadcrumbLabel, {
    quizId: quizId as Id<"quizzes">,
    ...(applicationId
      ? { applicationId: applicationId as Id<"applications"> }
      : {}),
  });

  return (
    <ResolvedBreadcrumbLabel fallbackLabel={fallbackLabel} label={label} />
  );
}

function AdminBlogPostBreadcrumbLabel({
  fallbackLabel,
  postId,
}: {
  fallbackLabel: string;
  postId: string;
}) {
  const label = useQuery(api.blogPosts.getBreadcrumbLabel, {
    postId: postId as Id<"blogPosts">,
  });

  return (
    <ResolvedBreadcrumbLabel fallbackLabel={fallbackLabel} label={label} />
  );
}

export function SiteHeaderBreadcrumbLabel({
  fallbackLabel,
  override,
}: SiteHeaderBreadcrumbLabelProps) {
  if (override.entity === "internship") {
    return (
      <RecruiterInternshipBreadcrumbLabel
        fallbackLabel={fallbackLabel}
        internshipId={override.internshipId}
      />
    );
  }

  if (override.entity === "blogPost") {
    return (
      <AdminBlogPostBreadcrumbLabel
        fallbackLabel={fallbackLabel}
        postId={override.postId}
      />
    );
  }

  if (override.scope === "admin") {
    return (
      <AdminQuizBreadcrumbLabel
        fallbackLabel={fallbackLabel}
        quizId={override.quizId}
      />
    );
  }

  if (override.scope === "candidate") {
    return (
      <CandidateQuizBreadcrumbLabel
        applicationId={override.applicationId}
        fallbackLabel={fallbackLabel}
        quizId={override.quizId}
      />
    );
  }

  return (
    <RecruiterQuizBreadcrumbLabel
      fallbackLabel={fallbackLabel}
      quizId={override.quizId}
    />
  );
}
