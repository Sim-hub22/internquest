import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { MutationCtx, internalMutation } from "@/convex/_generated/server";
import { userByClerkId } from "@/convex/users";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_PREFIX = "[Seed Analytics]";

const VIEWER_KIND_SEQUENCE = [
  "candidate",
  "anonymous",
  "candidate",
  "anonymous",
  "candidate",
  "recruiter",
] as const;

type SeedCandidate = {
  clerkId: string;
  username: string;
  name: string;
  email: string;
};

type SeedInternshipInput = {
  title: string;
  company: string;
  category:
    | "technology"
    | "business"
    | "design"
    | "marketing"
    | "finance"
    | "healthcare"
    | "other";
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  duration: string;
  stipend: number;
  createdDaysAgo: number;
  viewsByDayAgo: Record<number, number>;
  applications: Array<{
    candidateIndex: number;
    appliedDaysAgo: number;
    status:
      | "applied"
      | "under_review"
      | "shortlisted"
      | "quiz_assigned"
      | "quiz_completed"
      | "accepted"
      | "rejected";
    statusTrail?: Array<
      | "under_review"
      | "shortlisted"
      | "quiz_assigned"
      | "quiz_completed"
      | "accepted"
      | "rejected"
    >;
  }>;
};

const SEED_CANDIDATES: SeedCandidate[] = [
  {
    clerkId: "seed_candidate_analytics_1",
    username: "anisha.seed",
    name: "Anisha Sharma",
    email: "anisha.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_2",
    username: "rahul.seed",
    name: "Rahul Gurung",
    email: "rahul.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_3",
    username: "samikshya.seed",
    name: "Samikshya KC",
    email: "samikshya.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_4",
    username: "nabin.seed",
    name: "Nabin Bhandari",
    email: "nabin.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_5",
    username: "sushmita.seed",
    name: "Sushmita Thapa",
    email: "sushmita.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_6",
    username: "pratik.seed",
    name: "Pratik Oli",
    email: "pratik.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_7",
    username: "elina.seed",
    name: "Elina Rai",
    email: "elina.seed@example.com",
  },
  {
    clerkId: "seed_candidate_analytics_8",
    username: "rohan.seed",
    name: "Rohan Adhikari",
    email: "rohan.seed@example.com",
  },
];

const SEED_INTERNSHIPS: SeedInternshipInput[] = [
  {
    title: `${SEED_PREFIX} AI Platform Intern`,
    company: "Northstar Labs",
    category: "technology",
    location: "Kathmandu",
    locationType: "remote",
    duration: "6 months",
    stipend: 28000,
    createdDaysAgo: 28,
    viewsByDayAgo: {
      0: 7,
      1: 5,
      2: 4,
      4: 6,
      7: 5,
      10: 4,
      13: 6,
      18: 5,
      23: 4,
      27: 3,
    },
    applications: [
      {
        candidateIndex: 0,
        appliedDaysAgo: 24,
        status: "accepted",
        statusTrail: ["under_review", "shortlisted", "accepted"],
      },
      {
        candidateIndex: 1,
        appliedDaysAgo: 14,
        status: "quiz_assigned",
        statusTrail: ["under_review", "shortlisted", "quiz_assigned"],
      },
      {
        candidateIndex: 2,
        appliedDaysAgo: 8,
        status: "under_review",
        statusTrail: ["under_review"],
      },
      {
        candidateIndex: 3,
        appliedDaysAgo: 5,
        status: "rejected",
        statusTrail: ["under_review", "rejected"],
      },
    ],
  },
  {
    title: `${SEED_PREFIX} Product Design Intern`,
    company: "Orbit Studio",
    category: "design",
    location: "Lalitpur",
    locationType: "hybrid",
    duration: "4 months",
    stipend: 22000,
    createdDaysAgo: 22,
    viewsByDayAgo: {
      0: 4,
      1: 3,
      3: 2,
      6: 4,
      9: 3,
      12: 2,
      16: 3,
      20: 2,
    },
    applications: [
      {
        candidateIndex: 4,
        appliedDaysAgo: 17,
        status: "accepted",
        statusTrail: ["under_review", "shortlisted", "accepted"],
      },
      {
        candidateIndex: 5,
        appliedDaysAgo: 11,
        status: "shortlisted",
        statusTrail: ["under_review", "shortlisted"],
      },
      {
        candidateIndex: 6,
        appliedDaysAgo: 3,
        status: "applied",
      },
    ],
  },
  {
    title: `${SEED_PREFIX} Growth Marketing Intern`,
    company: "LiftCommerce",
    category: "marketing",
    location: "Bhaktapur",
    locationType: "onsite",
    duration: "3 months",
    stipend: 18000,
    createdDaysAgo: 18,
    viewsByDayAgo: {
      0: 3,
      2: 2,
      5: 3,
      8: 2,
      11: 3,
      14: 2,
      17: 2,
    },
    applications: [
      {
        candidateIndex: 7,
        appliedDaysAgo: 13,
        status: "rejected",
        statusTrail: ["under_review", "rejected"],
      },
      {
        candidateIndex: 0,
        appliedDaysAgo: 7,
        status: "accepted",
        statusTrail: ["under_review", "shortlisted", "accepted"],
      },
    ],
  },
];

function daysAgoTimestamp(daysAgo: number, hour: number, minute: number) {
  return (
    Date.now() - daysAgo * DAY_MS - hour * 60 * 60 * 1000 - minute * 60 * 1000
  );
}

async function ensureCandidate(
  ctx: MutationCtx,
  candidate: SeedCandidate
): Promise<Doc<"users">> {
  const existing = await userByClerkId(ctx, candidate.clerkId);

  if (existing) {
    if (existing.role !== "candidate") {
      await ctx.db.patch(existing._id, {
        role: "candidate",
        onboardingComplete: true,
        updatedAt: Date.now(),
      });
    }

    return {
      ...existing,
      role: "candidate",
      onboardingComplete: true,
    };
  }

  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    clerkId: candidate.clerkId,
    username: candidate.username,
    name: candidate.name,
    email: candidate.email,
    role: "candidate",
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  });

  const inserted = await ctx.db.get(userId);

  if (!inserted) {
    throw new ConvexError("Failed to create seed candidate");
  }

  return inserted;
}

async function deleteExistingSeedData(
  ctx: MutationCtx,
  recruiterId: Id<"users">
) {
  const internships = await ctx.db
    .query("internships")
    .withIndex("by_recruiter", (q) => q.eq("recruiterId", recruiterId))
    .collect();

  const seededInternships = internships.filter((internship) =>
    internship.title.startsWith(SEED_PREFIX)
  );

  for (const internship of seededInternships) {
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", internship._id))
      .collect();

    for (const application of applications) {
      const quizAttempts = await ctx.db
        .query("quizAttempts")
        .withIndex("by_application", (q) =>
          q.eq("applicationId", application._id)
        )
        .collect();

      for (const attempt of quizAttempts) {
        await ctx.db.delete(attempt._id);
      }

      await ctx.db.delete(application._id);
    }

    const views = await ctx.db
      .query("internshipViews")
      .withIndex("by_internship", (q) => q.eq("internshipId", internship._id))
      .collect();

    for (const view of views) {
      await ctx.db.delete(view._id);
    }

    await ctx.db.delete(internship._id);
  }
}

function buildStatusHistory(
  candidateId: Id<"users">,
  recruiterId: Id<"users">,
  appliedAt: number,
  trail: SeedInternshipInput["applications"][number]["statusTrail"]
) {
  const history = [
    {
      status: "applied",
      changedAt: appliedAt,
      changedBy: candidateId,
    },
  ];

  for (const [index, status] of (trail ?? []).entries()) {
    history.push({
      status,
      changedAt: appliedAt + (index + 1) * 60 * 60 * 1000,
      changedBy: recruiterId,
    });
  }

  return history;
}

export const seedRecruiterAnalytics = internalMutation({
  args: {
    clerkId: v.string(),
    resumeStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const recruiter = await userByClerkId(ctx, args.clerkId);

    if (!recruiter) {
      throw new ConvexError("Recruiter not found");
    }

    if (recruiter.role !== "recruiter") {
      throw new ConvexError("Target user is not a recruiter");
    }

    await deleteExistingSeedData(ctx, recruiter._id);

    const candidates = await Promise.all(
      SEED_CANDIDATES.map((candidate) => ensureCandidate(ctx, candidate))
    );

    const createdInternshipIds: Id<"internships">[] = [];

    for (const [
      internshipIndex,
      seedInternship,
    ] of SEED_INTERNSHIPS.entries()) {
      const createdAt = daysAgoTimestamp(seedInternship.createdDaysAgo, 9, 0);
      const totalViews = Object.values(seedInternship.viewsByDayAgo).reduce(
        (sum, count) => sum + count,
        0
      );

      const internshipId = await ctx.db.insert("internships", {
        recruiterId: recruiter._id,
        title: seedInternship.title,
        company: seedInternship.company,
        description: `<p>${seedInternship.title} generated for analytics preview.</p>`,
        category: seedInternship.category,
        location: seedInternship.location,
        locationType: seedInternship.locationType,
        duration: seedInternship.duration,
        stipend: seedInternship.stipend,
        requirements: [
          "Strong communication",
          "Structured thinking",
          "Ownership mindset",
        ],
        status: "open",
        applicationDeadline: Date.now() + 21 * DAY_MS,
        maxApplications: 50,
        viewCount: totalViews,
        createdAt,
        updatedAt: Date.now(),
      });

      createdInternshipIds.push(internshipId);

      let viewSequence = 0;

      for (const [daysAgoKey, count] of Object.entries(
        seedInternship.viewsByDayAgo
      )) {
        const daysAgo = Number(daysAgoKey);

        for (let index = 0; index < count; index += 1) {
          const viewerKind =
            VIEWER_KIND_SEQUENCE[
              (viewSequence + index) % VIEWER_KIND_SEQUENCE.length
            ];
          const candidate =
            candidates[(internshipIndex + index) % candidates.length];
          const viewedAt = daysAgoTimestamp(
            daysAgo,
            8 + (index % 10),
            (index * 7) % 60
          );

          await ctx.db.insert("internshipViews", {
            internshipId,
            ...(viewerKind === "anonymous"
              ? {}
              : {
                  viewerId:
                    viewerKind === "recruiter" ? recruiter._id : candidate._id,
                }),
            viewerKey:
              viewerKind === "anonymous"
                ? `seed-anon-${internshipIndex}-${daysAgo}-${index}`
                : viewerKind === "recruiter"
                  ? `user:${recruiter._id}`
                  : `user:${candidate._id}-${daysAgo}-${index}`,
            viewedAt,
          });
        }

        viewSequence += count;
      }

      for (const applicationSeed of seedInternship.applications) {
        const candidate = candidates[applicationSeed.candidateIndex];
        const appliedAt = daysAgoTimestamp(
          applicationSeed.appliedDaysAgo,
          10,
          15
        );
        const statusHistory = buildStatusHistory(
          candidate._id,
          recruiter._id,
          appliedAt,
          applicationSeed.statusTrail
        );

        await ctx.db.insert("applications", {
          internshipId,
          candidateId: candidate._id,
          resumeStorageId: args.resumeStorageId,
          coverLetter: `Seeded application from ${candidate.name} for analytics preview.`,
          status: applicationSeed.status,
          statusHistory,
          ...(applicationSeed.status === "quiz_assigned"
            ? {
                quizAssignedAt: appliedAt + 3 * 60 * 60 * 1000,
              }
            : {}),
          appliedAt,
          updatedAt:
            statusHistory[statusHistory.length - 1]?.changedAt ?? appliedAt,
        });
      }
    }

    return {
      recruiterId: recruiter._id,
      internshipsCreated: createdInternshipIds.length,
      internshipIds: createdInternshipIds,
      candidatesAvailable: candidates.length,
    };
  },
});
