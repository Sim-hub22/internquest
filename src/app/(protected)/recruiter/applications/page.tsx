import type { Route } from "next";
import { redirect } from "next/navigation";

export default function RecruiterApplicationsRedirectPage() {
  redirect("/recruiter/internships" as Route);
}
