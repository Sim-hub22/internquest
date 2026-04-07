const ROLE_PREFIX_SEGMENTS = new Set(["admin", "recruiter", "candidate"]);

const BREADCRUMB_LABELS: Record<string, string> = {
  candidate: "Candidate",
  recruiter: "Recruiter",
  admin: "Admin",
  dashboard: "Dashboard",
  applications: "Applications",
  quizzes: "Quizzes",
  internships: "Internships",
  notifications: "Notifications",
  profile: "Profile",
  settings: "Settings",
  blog: "Blog",
  reports: "Reports",
  users: "Users",
};

export type SiteHeaderBreadcrumb = {
  href: string;
  isCurrent: boolean;
  label: string;
};

export function toBreadcrumbLabel(segment: string) {
  const mapped = BREADCRUMB_LABELS[segment];

  if (mapped) {
    return mapped;
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildSiteHeaderBreadcrumbs(
  pathname: string
): SiteHeaderBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);

  return segments
    .map((segment, index) => ({
      segment,
      href: `/${segments.slice(0, index + 1).join("/")}`,
      isCurrent: index === segments.length - 1,
      label: toBreadcrumbLabel(segment),
    }))
    .filter(
      ({ segment }, index) =>
        !(index === 0 && ROLE_PREFIX_SEGMENTS.has(segment))
    )
    .map(({ href, isCurrent, label }) => ({
      href,
      isCurrent,
      label,
    }));
}
