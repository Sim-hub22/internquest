export type SidebarRole = "candidate" | "recruiter" | "admin" | null;

export type SidebarIcon =
  | "bell"
  | "book-open"
  | "briefcase"
  | "chart"
  | "clipboard-list"
  | "dashboard"
  | "settings"
  | "shield"
  | "user"
  | "users"
  | "logout";

export type SidebarNavItem = {
  title: string;
  url: string;
  icon: SidebarIcon;
};

const CANDIDATE_NAV: SidebarNavItem[] = [
  {
    title: "Dashboard",
    url: "/candidate/dashboard",
    icon: "dashboard",
  },
  {
    title: "Applications",
    url: "/candidate/applications",
    icon: "clipboard-list",
  },
  { title: "Quizzes", url: "/candidate/quizzes", icon: "book-open" },
  { title: "Profile", url: "/candidate/profile", icon: "user" },
];

const RECRUITER_NAV: SidebarNavItem[] = [
  {
    title: "Dashboard",
    url: "/recruiter/dashboard",
    icon: "dashboard",
  },
  {
    title: "Internships",
    url: "/recruiter/internships",
    icon: "briefcase",
  },
  { title: "Quizzes", url: "/recruiter/quizzes", icon: "book-open" },
];

const ADMIN_NAV: SidebarNavItem[] = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: "dashboard",
  },
  { title: "Users", url: "/admin/users", icon: "users" },
  { title: "Internships", url: "/admin/internships", icon: "briefcase" },
  { title: "Blog", url: "/admin/blog", icon: "book-open" },
  { title: "Quizzes", url: "/admin/quizzes", icon: "clipboard-list" },
  { title: "Reports", url: "/admin/reports", icon: "shield" },
];

export const SECONDARY_NAV: SidebarNavItem[] = [
  { title: "Exit Portal", url: "/", icon: "logout" },
];

export function getSidebarNavItems(role: SidebarRole): SidebarNavItem[] {
  if (role === "candidate") {
    return CANDIDATE_NAV;
  }

  if (role === "recruiter") {
    return RECRUITER_NAV;
  }

  if (role === "admin") {
    return ADMIN_NAV;
  }

  return [];
}

export function getSidebarDashboardHref(role: SidebarRole) {
  if (role === "candidate") {
    return "/candidate/dashboard";
  }

  if (role === "recruiter") {
    return "/recruiter/dashboard";
  }

  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/";
}
