import { describe, expect, it } from "vitest";

import { buildSiteHeaderBreadcrumbs } from "@/components/site-header-breadcrumbs";

describe("buildSiteHeaderBreadcrumbs", () => {
  it("hides the top-level admin segment but preserves prefixed hrefs", () => {
    expect(buildSiteHeaderBreadcrumbs("/admin/users/123")).toEqual([
      {
        href: "/admin/users",
        isCurrent: false,
        label: "Users",
      },
      {
        href: "/admin/users/123",
        isCurrent: true,
        label: "123",
      },
    ]);
  });

  it("keeps only the visible recruiter crumbs after filtering the role prefix", () => {
    expect(buildSiteHeaderBreadcrumbs("/recruiter/internships/new")).toEqual([
      {
        href: "/recruiter/internships",
        isCurrent: false,
        label: "Internships",
      },
      {
        href: "/recruiter/internships/new",
        isCurrent: true,
        label: "New",
      },
    ]);
  });

  it("marks the remaining visible crumb as current when the role prefix is removed", () => {
    expect(buildSiteHeaderBreadcrumbs("/candidate/dashboard")).toEqual([
      {
        href: "/candidate/dashboard",
        isCurrent: true,
        label: "Dashboard",
      },
    ]);
  });

  it("leaves non-role routes unchanged", () => {
    expect(buildSiteHeaderBreadcrumbs("/settings")).toEqual([
      {
        href: "/settings",
        isCurrent: true,
        label: "Settings",
      },
    ]);
  });
});
