import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createUserSeed(
  clerkId: string,
  role: "candidate" | "recruiter" | "admin"
) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: `${clerkId} name`,
    email: `${clerkId}@example.com`,
    role,
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/candidateProfiles", () => {
  it("rejects unauthenticated access", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.candidateProfiles.current, {})).rejects.toThrow(
      "UNAUTHENTICATED"
    );
  });

  it("allows candidate to upsert and returns normalized values", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_profile_1" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    const profileId = await t
      .withIdentity(candidateIdentity)
      .mutation(api.candidateProfiles.upsert, {
        headline: "  Backend-focused CS student  ",
        location: "  Kathmandu  ",
        preferredCategories: ["technology", "business"],
        preferredLocationType: "remote",
        education: [
          {
            institution: "  Tribhuvan University  ",
            degree: "  BSc CSIT  ",
            graduationYear: 2027,
            gpa: 3.75,
          },
        ],
        skills: [
          {
            name: "  TypeScript  ",
            proficiency: "advanced",
          },
        ],
        experience: [
          {
            title: "  Intern  ",
            company: "  InternQuest  ",
            startDate: " 2025-01 ",
            endDate: " 2025-06 ",
            description: " Built dashboard features ",
          },
        ],
        links: {
          github: "  https://github.com/candidate  ",
          linkedin: "  https://linkedin.com/in/candidate  ",
          portfolio: "  https://candidate.dev  ",
        },
      });

    expect(profileId).toBeTruthy();

    const profile = await t
      .withIdentity(candidateIdentity)
      .query(api.candidateProfiles.current, {});

    expect(profile?._id).toBe(profileId);
    expect(profile?.headline).toBe("Backend-focused CS student");
    expect(profile?.location).toBe("Kathmandu");
    expect(profile?.education[0]?.institution).toBe("Tribhuvan University");
    expect(profile?.education[0]?.degree).toBe("BSc CSIT");
    expect(profile?.skills[0]?.name).toBe("TypeScript");
    expect(profile?.experience[0]?.title).toBe("Intern");
    expect(profile?.links.github).toBe("https://github.com/candidate");
    expect(profile?.preferredCategories).toEqual(["technology", "business"]);
    expect(profile?.preferredLocationType).toBe("remote");
  });

  it("blocks recruiters from mutating candidate profile and blocks candidate cross-read", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_profile_1" };
    const candidateOneIdentity = { subject: "candidate_profile_2" };
    const candidateTwoIdentity = { subject: "candidate_profile_3" };

    const candidateTwoId = await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateOneIdentity.subject, "candidate")
      );
      const insertedCandidateTwoId = await ctx.db.insert(
        "users",
        createUserSeed(candidateTwoIdentity.subject, "candidate")
      );

      return insertedCandidateTwoId;
    });

    await expect(
      t.withIdentity(recruiterIdentity).mutation(api.candidateProfiles.upsert, {
        headline: "Recruiter should not set this",
        location: undefined,
        preferredCategories: undefined,
        preferredLocationType: undefined,
        education: [],
        skills: [],
        experience: [],
        links: {},
      })
    ).rejects.toThrow("FORBIDDEN");

    await expect(
      t
        .withIdentity(candidateOneIdentity)
        .query(api.candidateProfiles.getByUserId, {
          userId: candidateTwoId as Id<"users">,
        })
    ).rejects.toThrow("FORBIDDEN");
  });
});
