import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users & Profiles ───────────────────────────────────────────────────────

  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("candidate"),
        v.literal("recruiter"),
        v.literal("admin")
      )
    ),
    onboardingComplete: v.boolean(),
    bio: v.optional(v.string()),
    isSuspended: v.optional(v.boolean()),
    suspensionReason: v.optional(v.string()),
    suspendedAt: v.optional(v.number()),
    suspendedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

  candidateProfiles: defineTable({
    userId: v.id("users"),
    headline: v.optional(v.string()),
    education: v.array(
      v.object({
        institution: v.string(),
        degree: v.string(),
        graduationYear: v.number(),
        gpa: v.optional(v.number()),
      })
    ),
    skills: v.array(
      v.object({
        name: v.string(),
        proficiency: v.union(
          v.literal("beginner"),
          v.literal("intermediate"),
          v.literal("advanced")
        ),
      })
    ),
    experience: v.array(
      v.object({
        title: v.string(),
        company: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        description: v.optional(v.string()),
      })
    ),
    links: v.object({
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      portfolio: v.optional(v.string()),
    }),
    preferredCategories: v.optional(v.array(v.string())),
    preferredLocationType: v.optional(
      v.union(v.literal("remote"), v.literal("onsite"), v.literal("hybrid"))
    ),
    location: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Internships ─────────────────────────────────────────────────────────────

  internships: defineTable({
    recruiterId: v.id("users"),
    title: v.string(),
    company: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("technology"),
      v.literal("business"),
      v.literal("design"),
      v.literal("marketing"),
      v.literal("finance"),
      v.literal("healthcare"),
      v.literal("other")
    ),
    location: v.string(),
    locationType: v.union(
      v.literal("remote"),
      v.literal("onsite"),
      v.literal("hybrid")
    ),
    duration: v.string(),
    stipend: v.optional(v.number()),
    requirements: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")),
    applicationDeadline: v.number(),
    maxApplications: v.optional(v.number()),
    viewCount: v.number(),
    isClosedByAdmin: v.optional(v.boolean()),
    adminModerationReason: v.optional(v.string()),
    adminModeratedAt: v.optional(v.number()),
    adminModeratedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_recruiter", ["recruiterId"])
    .index("by_status", ["status"])
    .index("by_category_and_status", ["category", "status"])
    .index("by_status_and_locationType", ["status", "locationType"])
    .index("by_category_and_status_and_locationType", [
      "category",
      "status",
      "locationType",
    ])
    .index("by_status_and_deadline", ["status", "applicationDeadline"])
    .index("by_recruiter_and_status", ["recruiterId", "status"])
    .searchIndex("search_internships", {
      searchField: "title",
      filterFields: ["category", "status", "locationType"],
    }),

  // ─── Applications ────────────────────────────────────────────────────────────

  applications: defineTable({
    internshipId: v.id("internships"),
    candidateId: v.id("users"),
    resumeStorageId: v.id("_storage"),
    coverLetter: v.optional(v.string()),
    assignedQuizId: v.optional(v.id("quizzes")),
    quizAssignedAt: v.optional(v.number()),
    status: v.union(
      v.literal("applied"),
      v.literal("under_review"),
      v.literal("shortlisted"),
      v.literal("quiz_assigned"),
      v.literal("quiz_completed"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    statusHistory: v.array(
      v.object({
        status: v.string(),
        changedAt: v.number(),
        changedBy: v.optional(v.string()),
      })
    ),
    appliedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_internship", ["internshipId"])
    .index("by_internship_and_appliedAt", ["internshipId", "appliedAt"])
    .index("by_candidate", ["candidateId"])
    .index("by_assigned_quiz", ["assignedQuizId"])
    .index("by_candidate_and_internship", ["candidateId", "internshipId"])
    .index("by_internship_and_status", ["internshipId", "status"])
    .index("by_candidate_and_status", ["candidateId", "status"]),

  // ─── Quizzes ─────────────────────────────────────────────────────────────────

  quizzes: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("recruitment"), v.literal("sample")),
    internshipId: v.optional(v.id("internships")),
    timeLimit: v.optional(v.number()),
    questions: v.array(
      v.object({
        id: v.string(),
        type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
        question: v.string(),
        points: v.number(),
        options: v.optional(
          v.array(
            v.object({
              id: v.string(),
              text: v.string(),
            })
          )
        ),
        correctOptionId: v.optional(v.string()),
        sampleAnswer: v.optional(v.string()),
      })
    ),
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_creator_and_type", ["creatorId", "type"])
    .index("by_creator_and_type_and_published", [
      "creatorId",
      "type",
      "isPublished",
    ])
    .index("by_type", ["type"])
    .index("by_internship", ["internshipId"])
    .index("by_type_and_published", ["type", "isPublished"]),

  quizAttempts: defineTable({
    quizId: v.id("quizzes"),
    candidateId: v.id("users"),
    applicationId: v.optional(v.id("applications")),
    attemptType: v.union(v.literal("application"), v.literal("sample")),
    answers: v.array(
      v.object({
        questionId: v.string(),
        type: v.union(v.literal("multiple_choice"), v.literal("short_answer")),
        selectedOptionId: v.optional(v.string()),
        textAnswer: v.optional(v.string()),
        awardedPoints: v.optional(v.number()),
        feedback: v.optional(v.string()),
        isCorrect: v.optional(v.boolean()),
      })
    ),
    score: v.optional(v.number()),
    autoScore: v.optional(v.number()),
    manualScore: v.optional(v.number()),
    maxScore: v.number(),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),
    timeLimit: v.optional(v.number()),
    submissionMode: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("timeout"),
        v.literal("policy_violation")
      )
    ),
    policyViolationType: v.optional(
      v.union(v.literal("tab_hidden"), v.literal("page_exit"))
    ),
    policyViolationAt: v.optional(v.number()),
    gradedAt: v.optional(v.number()),
    gradedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("graded")
    ),
  })
    .index("by_quiz", ["quizId"])
    .index("by_candidate", ["candidateId"])
    .index("by_application", ["applicationId"])
    .index("by_quiz_and_status", ["quizId", "status"])
    .index("by_candidate_and_status", ["candidateId", "status"])
    .index("by_candidate_and_quiz_and_attemptType", [
      "candidateId",
      "quizId",
      "attemptType",
    ]),

  // ─── Blog / Resources ────────────────────────────────────────────────────────

  blogPosts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    coverImageStorageId: v.optional(v.id("_storage")),
    category: v.union(
      v.literal("career_tips"),
      v.literal("interview_prep"),
      v.literal("industry_insights"),
      v.literal("resume_guide"),
      v.literal("general")
    ),
    tags: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_status_and_publishedAt", ["status", "publishedAt"])
    .index("by_category_and_status", ["category", "status"])
    .index("by_category_and_status_and_publishedAt", [
      "category",
      "status",
      "publishedAt",
    ])
    .index("by_author", ["authorId"])
    .searchIndex("search_posts", {
      searchField: "title",
      filterFields: ["category", "status"],
    }),

  // ─── Notifications ───────────────────────────────────────────────────────────

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("application_status"),
      v.literal("quiz_assigned"),
      v.literal("quiz_submitted"),
      v.literal("quiz_graded"),
      v.literal("new_internship"),
      v.literal("new_application"),
      v.literal("new_resource")
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    relatedId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_user_and_type", ["userId", "type"])
    .index("by_user_and_read_and_type", ["userId", "isRead", "type"]),

  // ─── Analytics ───────────────────────────────────────────────────────────────

  internshipViews: defineTable({
    internshipId: v.id("internships"),
    viewerId: v.optional(v.id("users")),
    // Temporarily optional to allow production backfill of legacy rows.
    viewerKey: v.optional(v.string()),
    viewedAt: v.number(),
  })
    .index("by_internship", ["internshipId"])
    .index("by_internship_and_viewerKey_and_viewedAt", [
      "internshipId",
      "viewerKey",
      "viewedAt",
    ])
    .index("by_internship_and_date", ["internshipId", "viewedAt"]),

  // ─── Moderation ──────────────────────────────────────────────────────────────

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(
      v.literal("internship"),
      v.literal("user"),
      v.literal("blog_post")
    ),
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    actionType: v.optional(
      v.union(
        v.literal("close_internship"),
        v.literal("unpublish_blog_post"),
        v.literal("suspend_user")
      )
    ),
    actionSummary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_targetType", ["targetType"])
    .index("by_target_type_and_status", ["targetType", "status"])
    .index("by_reporter_and_target_and_status", [
      "reporterId",
      "targetType",
      "targetId",
      "status",
    ]),
});
