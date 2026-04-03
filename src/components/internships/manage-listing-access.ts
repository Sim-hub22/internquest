import type { Doc } from "@/convex/_generated/dataModel";

type ManageListingViewer =
  | Pick<Doc<"users">, "_id" | "role">
  | null
  | undefined;
type ManagedInternship =
  | Pick<Doc<"internships">, "recruiterId">
  | null
  | undefined;

export function canRecruiterManageInternship(
  viewer: ManageListingViewer,
  internship: ManagedInternship
) {
  return (
    viewer?.role === "recruiter" &&
    internship !== null &&
    internship !== undefined &&
    viewer._id === internship.recruiterId
  );
}
