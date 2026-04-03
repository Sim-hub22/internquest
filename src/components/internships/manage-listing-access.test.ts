import { describe, expect, it } from "vitest";

import { canRecruiterManageInternship } from "@/components/internships/manage-listing-access";
import type { Doc } from "@/convex/_generated/dataModel";

function createViewer(
  overrides?: Partial<Pick<Doc<"users">, "_id" | "role">>
): Pick<Doc<"users">, "_id" | "role"> {
  return {
    _id: "user_1" as Doc<"users">["_id"],
    role: "recruiter",
    ...overrides,
  };
}

function createInternship(
  overrides?: Partial<Pick<Doc<"internships">, "recruiterId">>
): Pick<Doc<"internships">, "recruiterId"> {
  return {
    recruiterId: "user_1" as Doc<"internships">["recruiterId"],
    ...overrides,
  };
}

describe("canRecruiterManageInternship", () => {
  it("returns true for the recruiter who owns the internship", () => {
    expect(
      canRecruiterManageInternship(createViewer(), createInternship())
    ).toBe(true);
  });

  it("returns false for a recruiter who does not own the internship", () => {
    expect(
      canRecruiterManageInternship(
        createViewer({ _id: "user_2" as Doc<"users">["_id"] }),
        createInternship()
      )
    ).toBe(false);
  });

  it("returns false for non-recruiters", () => {
    expect(
      canRecruiterManageInternship(
        createViewer({ role: "candidate" }),
        createInternship()
      )
    ).toBe(false);
  });

  it("returns false when the internship is unavailable", () => {
    expect(canRecruiterManageInternship(createViewer(), null)).toBe(false);
  });
});
