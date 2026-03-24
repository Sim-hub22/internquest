import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { MutationCtx, internalMutation } from "@/convex/_generated/server";
import { userByClerkId } from "@/convex/users";

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_PREFIX = "[Seed Analytics]";
const REPORTS_SEED_PREFIX = "[Seed Reports]";

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

type SeedPreviewUser = SeedCandidate & {
  role: "candidate" | "recruiter";
};

type SeedReportPreviewEntry = {
  reporterKey: keyof typeof REPORTS_SEED_USERS;
  targetType: "internship" | "blog_post" | "user";
  targetKey: string;
  reason:
    | "spam"
    | "misleading_information"
    | "inappropriate_content"
    | "fraud_or_scam"
    | "harassment"
    | "other";
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  details: string;
  reviewNotes?: string;
  actionType?: "close_internship" | "unpublish_blog_post";
  createdDaysAgo: number;
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

const REPORTS_SEED_USERS: Record<string, SeedPreviewUser> = {
  recruiter: {
    clerkId: "seed_reports_preview_recruiter",
    username: "preview.recruiter",
    name: "Preview Recruiter",
    email: "preview.recruiter@example.com",
    role: "recruiter",
  },
  reporterOne: {
    clerkId: "seed_reports_preview_reporter_one",
    username: "maya.preview",
    name: "Maya Karki",
    email: "maya.preview@example.com",
    role: "candidate",
  },
  reporterTwo: {
    clerkId: "seed_reports_preview_reporter_two",
    username: "sajan.preview",
    name: "Sajan Khadka",
    email: "sajan.preview@example.com",
    role: "candidate",
  },
  reporterThree: {
    clerkId: "seed_reports_preview_reporter_three",
    username: "rhea.preview",
    name: "Rhea Rai",
    email: "rhea.preview@example.com",
    role: "candidate",
  },
  reporterFour: {
    clerkId: "seed_reports_preview_reporter_four",
    username: "nima.preview",
    name: "Nima Sherpa",
    email: "nima.preview@example.com",
    role: "candidate",
  },
  reporterFive: {
    clerkId: "seed_reports_preview_reporter_five",
    username: "kabin.preview",
    name: "Kabin Shahi",
    email: "kabin.preview@example.com",
    role: "candidate",
  },
  targetUser: {
    clerkId: "seed_reports_preview_target_user",
    username: "flagged.preview",
    name: "Flagged Preview User",
    email: "flagged.preview@example.com",
    role: "candidate",
  },
};

const REPORTS_PREVIEW_INTERNSHIPS = [
  {
    key: "payments",
    title: `${REPORTS_SEED_PREFIX} Payments Operations Intern`,
    company: "LedgerLoop",
    category: "finance" as const,
    location: "Kathmandu",
    locationType: "hybrid" as const,
    duration: "4 months",
    stipend: 24000,
    createdDaysAgo: 4,
  },
  {
    key: "content",
    title: `${REPORTS_SEED_PREFIX} Content Strategy Intern`,
    company: "Narrative House",
    category: "marketing" as const,
    location: "Lalitpur",
    locationType: "remote" as const,
    duration: "3 months",
    stipend: 18000,
    createdDaysAgo: 3,
  },
  {
    key: "design",
    title: `${REPORTS_SEED_PREFIX} Product Design Intern`,
    company: "Northbound Studio",
    category: "design" as const,
    location: "Bhaktapur",
    locationType: "onsite" as const,
    duration: "6 months",
    stipend: 26000,
    createdDaysAgo: 2,
  },
] as const;

const REPORTS_PREVIEW_POSTS = [
  {
    key: "salary-guide",
    title: `${REPORTS_SEED_PREFIX} Internship Salary Guide`,
    slug: "seed-reports-preview-internship-salary-guide",
    excerpt:
      "A preview resource post used to demonstrate the moderation queue with realistic report states.",
    category: "career_tips" as const,
    createdDaysAgo: 5,
  },
  {
    key: "cv-checklist",
    title: `${REPORTS_SEED_PREFIX} CV Checklist for Fresh Graduates`,
    slug: "seed-reports-preview-cv-checklist",
    excerpt:
      "Another preview post seeded for the reports page so the review drawer has content to inspect.",
    category: "resume_guide" as const,
    createdDaysAgo: 1,
  },
] as const;

const REPORTS_PREVIEW_ENTRIES: SeedReportPreviewEntry[] = [
  {
    reporterKey: "reporterOne",
    targetType: "internship" as const,
    targetKey: "payments",
    reason: "misleading_information" as const,
    status: "pending" as const,
    details: `${REPORTS_SEED_PREFIX} The stipend and work arrangement look inconsistent across the listing details.`,
    createdDaysAgo: 0,
  },
  {
    reporterKey: "reporterTwo",
    targetType: "blog_post" as const,
    targetKey: "salary-guide",
    reason: "other" as const,
    status: "pending" as const,
    details: `${REPORTS_SEED_PREFIX} This preview report keeps the queue populated with a blog-resource moderation case.`,
    createdDaysAgo: 0,
  },
  {
    reporterKey: "reporterThree",
    targetType: "user" as const,
    targetKey: "targetUser",
    reason: "harassment" as const,
    status: "pending" as const,
    details: `${REPORTS_SEED_PREFIX} The reported profile is here so the user-target review state is visible in the admin queue.`,
    createdDaysAgo: 1,
  },
  {
    reporterKey: "reporterFour",
    targetType: "internship" as const,
    targetKey: "content",
    reason: "spam" as const,
    status: "reviewed" as const,
    details: `${REPORTS_SEED_PREFIX} Kept as reviewed so you can preview an in-progress moderation item.`,
    reviewNotes: `${REPORTS_SEED_PREFIX} Checked the recruiter profile and noted that the job copy needs a closer audit.`,
    createdDaysAgo: 2,
  },
  {
    reporterKey: "reporterFive",
    targetType: "internship" as const,
    targetKey: "payments",
    reason: "fraud_or_scam" as const,
    status: "dismissed" as const,
    details: `${REPORTS_SEED_PREFIX} Added to show how dismissed items sort and display in the queue.`,
    reviewNotes: `${REPORTS_SEED_PREFIX} Duplicate concern with insufficient evidence after review.`,
    createdDaysAgo: 3,
  },
  {
    reporterKey: "reporterTwo",
    targetType: "internship" as const,
    targetKey: "design",
    reason: "inappropriate_content" as const,
    status: "resolved" as const,
    details: `${REPORTS_SEED_PREFIX} This one demonstrates a resolved internship report with an admin action applied.`,
    reviewNotes: `${REPORTS_SEED_PREFIX} Listing was closed after confirming the content violated publishing standards.`,
    actionType: "close_internship" as const,
    createdDaysAgo: 4,
  },
  {
    reporterKey: "reporterOne",
    targetType: "blog_post" as const,
    targetKey: "cv-checklist",
    reason: "spam" as const,
    status: "resolved" as const,
    details: `${REPORTS_SEED_PREFIX} This resolved resource case lets you preview the unpublish action state.`,
    reviewNotes: `${REPORTS_SEED_PREFIX} Post was moved back to draft after moderation review.`,
    actionType: "unpublish_blog_post" as const,
    createdDaysAgo: 5,
  },
] as const;

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

async function ensurePreviewUser(
  ctx: MutationCtx,
  user: SeedPreviewUser
): Promise<Doc<"users">> {
  const existing = await userByClerkId(ctx, user.clerkId);

  if (existing) {
    await ctx.db.patch(existing._id, {
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingComplete: true,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(existing._id);

    if (!updated) {
      throw new ConvexError("Failed to update preview user");
    }

    return updated;
  }

  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    clerkId: user.clerkId,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  });
  const inserted = await ctx.db.get(userId);

  if (!inserted) {
    throw new ConvexError("Failed to create preview user");
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

async function deleteExistingReportsPreviewData(ctx: MutationCtx) {
  const reports = await ctx.db.query("reports").collect();

  for (const report of reports) {
    const isSeeded =
      report.details?.startsWith(REPORTS_SEED_PREFIX) ||
      report.reviewNotes?.startsWith(REPORTS_SEED_PREFIX);

    if (isSeeded) {
      await ctx.db.delete(report._id);
    }
  }

  const blogPosts = await ctx.db.query("blogPosts").collect();

  for (const post of blogPosts) {
    if (
      post.title.startsWith(REPORTS_SEED_PREFIX) ||
      post.slug.startsWith("seed-reports-preview-")
    ) {
      await ctx.db.delete(post._id);
    }
  }

  const internships = await ctx.db.query("internships").collect();

  for (const internship of internships) {
    if (internship.title.startsWith(REPORTS_SEED_PREFIX)) {
      await ctx.db.delete(internship._id);
    }
  }

  const users = await ctx.db.query("users").collect();

  for (const user of users) {
    if (user.clerkId.startsWith("seed_reports_preview_")) {
      await ctx.db.delete(user._id);
    }
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

export const seedReportsPreview = internalMutation({
  args: {},
  handler: async (ctx) => {
    await deleteExistingReportsPreviewData(ctx);

    const users = await ctx.db.query("users").collect();
    const adminUsers = users.filter((user) => user.role === "admin");

    if (adminUsers.length === 0) {
      throw new ConvexError(
        "An admin user is required to seed report previews"
      );
    }

    const admin = adminUsers[0];
    const previewUsers = await Promise.all(
      Object.entries(REPORTS_SEED_USERS).map(async ([key, user]) => {
        const createdUser = await ensurePreviewUser(ctx, user);
        return [key, createdUser] as const;
      })
    );
    const previewUserMap = new Map(previewUsers);
    const recruiter = previewUserMap.get("recruiter");

    if (!recruiter) {
      throw new ConvexError("Preview recruiter could not be created");
    }

    const internships = await Promise.all(
      REPORTS_PREVIEW_INTERNSHIPS.map(async (internshipSeed) => {
        const createdAt = daysAgoTimestamp(internshipSeed.createdDaysAgo, 9, 0);
        const internshipId = await ctx.db.insert("internships", {
          recruiterId: recruiter._id,
          title: internshipSeed.title,
          company: internshipSeed.company,
          description: `<p>${internshipSeed.title} exists to preview the moderation reports queue in a filled state.</p>`,
          category: internshipSeed.category,
          location: internshipSeed.location,
          locationType: internshipSeed.locationType,
          duration: internshipSeed.duration,
          stipend: internshipSeed.stipend,
          requirements: [
            "Comfortable with async communication",
            "Able to document work clearly",
            "Open to iterative feedback",
          ],
          status: "open",
          applicationDeadline: Date.now() + 14 * DAY_MS,
          maxApplications: 30,
          viewCount: 0,
          createdAt,
          updatedAt: createdAt,
        });

        return [internshipSeed.key, internshipId] as const;
      })
    );
    const internshipMap = new Map(internships);

    const posts = await Promise.all(
      REPORTS_PREVIEW_POSTS.map(async (postSeed) => {
        const createdAt = daysAgoTimestamp(postSeed.createdDaysAgo, 8, 30);
        const postId = await ctx.db.insert("blogPosts", {
          authorId: admin._id,
          title: postSeed.title,
          slug: postSeed.slug,
          content: `<p>${postSeed.title} exists only to preview the moderation reports queue with realistic content records.</p>`,
          excerpt: postSeed.excerpt,
          category: postSeed.category,
          tags: ["seed", "reports", "moderation"],
          status: "published",
          publishedAt: createdAt + 60 * 60 * 1000,
          createdAt,
          updatedAt: createdAt,
        });

        return [postSeed.key, postId] as const;
      })
    );
    const postMap = new Map(posts);

    const createdReportIds: Id<"reports">[] = [];

    for (const reportSeed of REPORTS_PREVIEW_ENTRIES) {
      const reporter = previewUserMap.get(reportSeed.reporterKey);

      if (!reporter) {
        throw new ConvexError("Preview reporter could not be found");
      }

      const targetId =
        reportSeed.targetType === "internship"
          ? internshipMap.get(
              reportSeed.targetKey as (typeof REPORTS_PREVIEW_INTERNSHIPS)[number]["key"]
            )
          : reportSeed.targetType === "blog_post"
            ? postMap.get(
                reportSeed.targetKey as (typeof REPORTS_PREVIEW_POSTS)[number]["key"]
              )
            : previewUserMap.get(
                reportSeed.targetKey as keyof typeof REPORTS_SEED_USERS
              )?._id;

      if (!targetId) {
        throw new ConvexError("Preview report target could not be found");
      }

      if (
        reportSeed.status === "resolved" &&
        reportSeed.actionType === "close_internship"
      ) {
        await ctx.db.patch(targetId as Id<"internships">, {
          status: "closed",
          isClosedByAdmin: true,
          adminModerationReason: reportSeed.reviewNotes,
          adminModeratedAt: daysAgoTimestamp(reportSeed.createdDaysAgo, 11, 45),
          adminModeratedBy: admin._id,
          updatedAt: Date.now(),
        });
      }

      if (
        reportSeed.status === "resolved" &&
        reportSeed.actionType === "unpublish_blog_post"
      ) {
        await ctx.db.patch(targetId as Id<"blogPosts">, {
          status: "draft",
          updatedAt: Date.now(),
        });
      }

      const createdAt = daysAgoTimestamp(reportSeed.createdDaysAgo, 11, 15);
      const reviewedAt =
        reportSeed.status === "pending"
          ? undefined
          : createdAt + 2 * 60 * 60 * 1000;
      const reportId = await ctx.db.insert("reports", {
        reporterId: reporter._id,
        targetType: reportSeed.targetType,
        targetId,
        reason: reportSeed.reason,
        details: reportSeed.details,
        status: reportSeed.status,
        ...(reviewedAt
          ? {
              reviewedBy: admin._id,
              reviewedAt,
            }
          : {}),
        ...(reportSeed.reviewNotes
          ? {
              reviewNotes: reportSeed.reviewNotes,
            }
          : {}),
        ...(reportSeed.actionType
          ? {
              actionType: reportSeed.actionType,
              actionSummary:
                reportSeed.actionType === "close_internship"
                  ? "Close Internship"
                  : "Unpublish Blog Post",
            }
          : {}),
        createdAt,
      });

      createdReportIds.push(reportId);
    }

    return {
      reportsCreated: createdReportIds.length,
      reportIds: createdReportIds,
      seededInternships: internshipMap.size,
      seededPosts: postMap.size,
      seededUsers: previewUserMap.size,
    };
  },
});
