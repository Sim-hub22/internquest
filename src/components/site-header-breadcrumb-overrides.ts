type SearchParamsLike = {
  get(name: string): string | null;
};

const STATIC_RECRUITER_INTERNSHIP_SEGMENTS = new Set(["analytics", "new"]);
const STATIC_QUIZ_SEGMENTS = new Set(["new"]);
const STATIC_ADMIN_BLOG_SEGMENTS = new Set(["new"]);

export type SiteHeaderBreadcrumbOverride =
  | {
      entity: "internship";
      href: string;
      internshipId: string;
      scope: "recruiter";
    }
  | {
      applicationId: string;
      entity: "application";
      href: string;
      scope: "candidate" | "recruiter";
    }
  | {
      entity: "quiz";
      href: string;
      quizId: string;
      scope: "admin" | "candidate" | "recruiter";
      applicationId?: string;
    }
  | {
      entity: "blogPost";
      href: string;
      postId: string;
      scope: "admin";
    };

function isConvexDocumentId(value: string | null | undefined): value is string {
  return /^[A-Za-z0-9]{20,}$/.test(value ?? "");
}

export function getSiteHeaderBreadcrumbOverrides(
  pathname: string,
  searchParams?: SearchParamsLike | null
): SiteHeaderBreadcrumbOverride[] {
  const segments = pathname.split("/").filter(Boolean);
  const overrides: SiteHeaderBreadcrumbOverride[] = [];

  if (
    segments[0] === "recruiter" &&
    segments[1] === "internships" &&
    !STATIC_RECRUITER_INTERNSHIP_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    overrides.push({
      entity: "internship",
      href: `/recruiter/internships/${segments[2]}`,
      internshipId: segments[2],
      scope: "recruiter",
    });
  }

  if (
    segments[0] === "recruiter" &&
    segments[1] === "internships" &&
    !STATIC_RECRUITER_INTERNSHIP_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2]) &&
    segments[3] === "applications" &&
    isConvexDocumentId(segments[4])
  ) {
    overrides.push({
      applicationId: segments[4],
      entity: "application",
      href: `/recruiter/internships/${segments[2]}/applications/${segments[4]}`,
      scope: "recruiter",
    });
  }

  if (overrides.length > 0) {
    return overrides;
  }

  if (
    segments[0] === "recruiter" &&
    segments[1] === "quizzes" &&
    !STATIC_QUIZ_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return [
      {
        entity: "quiz",
        href: `/recruiter/quizzes/${segments[2]}`,
        quizId: segments[2],
        scope: "recruiter",
      },
    ];
  }

  if (
    segments[0] === "admin" &&
    segments[1] === "quizzes" &&
    !STATIC_QUIZ_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return [
      {
        entity: "quiz",
        href: `/admin/quizzes/${segments[2]}`,
        quizId: segments[2],
        scope: "admin",
      },
    ];
  }

  if (
    segments[0] === "candidate" &&
    segments[1] === "applications" &&
    isConvexDocumentId(segments[2])
  ) {
    return [
      {
        applicationId: segments[2],
        entity: "application",
        href: `/candidate/applications/${segments[2]}`,
        scope: "candidate",
      },
    ];
  }

  if (
    segments[0] === "candidate" &&
    segments[1] === "quizzes" &&
    isConvexDocumentId(segments[2])
  ) {
    const applicationId = searchParams?.get("applicationId");

    return [
      {
        entity: "quiz",
        href: `/candidate/quizzes/${segments[2]}`,
        quizId: segments[2],
        scope: "candidate",
        ...(isConvexDocumentId(applicationId) ? { applicationId } : {}),
      },
    ];
  }

  if (
    segments[0] === "admin" &&
    segments[1] === "blog" &&
    !STATIC_ADMIN_BLOG_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return [
      {
        entity: "blogPost",
        href: `/admin/blog/${segments[2]}`,
        postId: segments[2],
        scope: "admin",
      },
    ];
  }

  return [];
}

export function getSiteHeaderBreadcrumbOverride(
  pathname: string,
  searchParams?: SearchParamsLike | null
): SiteHeaderBreadcrumbOverride | null {
  return getSiteHeaderBreadcrumbOverrides(pathname, searchParams)[0] ?? null;
}
