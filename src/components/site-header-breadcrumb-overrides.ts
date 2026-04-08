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

export function getSiteHeaderBreadcrumbOverride(
  pathname: string,
  searchParams?: SearchParamsLike | null
): SiteHeaderBreadcrumbOverride | null {
  const segments = pathname.split("/").filter(Boolean);

  if (
    segments[0] === "recruiter" &&
    segments[1] === "internships" &&
    !STATIC_RECRUITER_INTERNSHIP_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return {
      entity: "internship",
      href: `/recruiter/internships/${segments[2]}`,
      internshipId: segments[2],
      scope: "recruiter",
    };
  }

  if (
    segments[0] === "recruiter" &&
    segments[1] === "quizzes" &&
    !STATIC_QUIZ_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return {
      entity: "quiz",
      href: `/recruiter/quizzes/${segments[2]}`,
      quizId: segments[2],
      scope: "recruiter",
    };
  }

  if (
    segments[0] === "admin" &&
    segments[1] === "quizzes" &&
    !STATIC_QUIZ_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return {
      entity: "quiz",
      href: `/admin/quizzes/${segments[2]}`,
      quizId: segments[2],
      scope: "admin",
    };
  }

  if (
    segments[0] === "candidate" &&
    segments[1] === "quizzes" &&
    isConvexDocumentId(segments[2])
  ) {
    const applicationId = searchParams?.get("applicationId");

    return {
      entity: "quiz",
      href: `/candidate/quizzes/${segments[2]}`,
      quizId: segments[2],
      scope: "candidate",
      ...(isConvexDocumentId(applicationId) ? { applicationId } : {}),
    };
  }

  if (
    segments[0] === "admin" &&
    segments[1] === "blog" &&
    !STATIC_ADMIN_BLOG_SEGMENTS.has(segments[2] ?? "") &&
    isConvexDocumentId(segments[2])
  ) {
    return {
      entity: "blogPost",
      href: `/admin/blog/${segments[2]}`,
      postId: segments[2],
      scope: "admin",
    };
  }

  return null;
}
