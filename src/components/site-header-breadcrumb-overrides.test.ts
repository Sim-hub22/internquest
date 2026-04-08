import { describe, expect, it } from "vitest";

import { getSiteHeaderBreadcrumbOverride } from "@/components/site-header-breadcrumb-overrides";

const INTERNSHIP_ID = "Jx75fzsdkqkvz5dfjx631pkrs1845bq6";
const QUIZ_ID = "K972x5d9ggxbmhpbs11r9nmpnx84c7ea";
const APPLICATION_ID = "a19kqp9rf1bzj3d0x7hy6mn2pc4st8uv";
const BLOG_POST_ID = "p84nzb73qk5dx1tc9rv0m2sjh6waeufy";

describe("getSiteHeaderBreadcrumbOverride", () => {
  it("matches recruiter internship detail routes", () => {
    expect(
      getSiteHeaderBreadcrumbOverride(`/recruiter/internships/${INTERNSHIP_ID}`)
    ).toEqual({
      entity: "internship",
      href: `/recruiter/internships/${INTERNSHIP_ID}`,
      internshipId: INTERNSHIP_ID,
      scope: "recruiter",
    });
  });

  it("matches nested recruiter internship application routes", () => {
    expect(
      getSiteHeaderBreadcrumbOverride(
        `/recruiter/internships/${INTERNSHIP_ID}/applications/${APPLICATION_ID}`
      )
    ).toEqual({
      entity: "internship",
      href: `/recruiter/internships/${INTERNSHIP_ID}`,
      internshipId: INTERNSHIP_ID,
      scope: "recruiter",
    });
  });

  it("matches recruiter quiz result routes", () => {
    expect(
      getSiteHeaderBreadcrumbOverride(`/recruiter/quizzes/${QUIZ_ID}/results`)
    ).toEqual({
      entity: "quiz",
      href: `/recruiter/quizzes/${QUIZ_ID}`,
      quizId: QUIZ_ID,
      scope: "recruiter",
    });
  });

  it("matches admin quiz edit and preview routes", () => {
    expect(
      getSiteHeaderBreadcrumbOverride(`/admin/quizzes/${QUIZ_ID}/edit`)
    ).toEqual({
      entity: "quiz",
      href: `/admin/quizzes/${QUIZ_ID}`,
      quizId: QUIZ_ID,
      scope: "admin",
    });

    expect(
      getSiteHeaderBreadcrumbOverride(`/admin/quizzes/${QUIZ_ID}/preview`)
    ).toEqual({
      entity: "quiz",
      href: `/admin/quizzes/${QUIZ_ID}`,
      quizId: QUIZ_ID,
      scope: "admin",
    });
  });

  it("matches admin blog detail and edit routes", () => {
    expect(
      getSiteHeaderBreadcrumbOverride(`/admin/blog/${BLOG_POST_ID}`)
    ).toEqual({
      entity: "blogPost",
      href: `/admin/blog/${BLOG_POST_ID}`,
      postId: BLOG_POST_ID,
      scope: "admin",
    });

    expect(
      getSiteHeaderBreadcrumbOverride(`/admin/blog/${BLOG_POST_ID}/edit`)
    ).toEqual({
      entity: "blogPost",
      href: `/admin/blog/${BLOG_POST_ID}`,
      postId: BLOG_POST_ID,
      scope: "admin",
    });
  });

  it("matches candidate quiz routes and forwards the application id", () => {
    const searchParams = new URLSearchParams({
      applicationId: APPLICATION_ID,
    });

    expect(
      getSiteHeaderBreadcrumbOverride(
        `/candidate/quizzes/${QUIZ_ID}/result`,
        searchParams
      )
    ).toEqual({
      applicationId: APPLICATION_ID,
      entity: "quiz",
      href: `/candidate/quizzes/${QUIZ_ID}`,
      quizId: QUIZ_ID,
      scope: "candidate",
    });
  });

  it("ignores unrelated routes and static create pages", () => {
    expect(getSiteHeaderBreadcrumbOverride("/candidate/dashboard")).toBeNull();
    expect(getSiteHeaderBreadcrumbOverride("/recruiter/internships/new")).toBe(
      null
    );
    expect(getSiteHeaderBreadcrumbOverride("/admin/quizzes/new")).toBeNull();
    expect(getSiteHeaderBreadcrumbOverride("/admin/blog/new")).toBeNull();
  });
});
