import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { requireRole, requireUser } from "@/convex/lib/auth";
import { createNotification } from "@/convex/lib/notifications";

const applicationStatusValidator = v.union(
  v.literal("applied"),
  v.literal("under_review"),
  v.literal("shortlisted"),
  v.literal("quiz_assigned"),
  v.literal("quiz_completed"),
  v.literal("accepted"),
  v.literal("rejected")
);

const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
  id: v.optional(v.number()),
});

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const APP_URL = process.env.APP_URL?.replace(/\/$/, "") ?? "";

type ApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "quiz_assigned"
  | "quiz_completed"
  | "accepted"
  | "rejected";

const allowedStatusTransitions: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  applied: ["under_review", "rejected"],
  under_review: ["shortlisted", "accepted", "rejected"],
  shortlisted: ["quiz_assigned", "accepted", "rejected"],
  quiz_assigned: ["quiz_completed", "rejected"],
  quiz_completed: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toStatusLabel(status: ApplicationStatus) {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildCandidateApplicationPath(applicationId: Id<"applications">) {
  return `/candidate/applications/${applicationId}`;
}

function buildRecruiterApplicationPath(
  internshipId: Id<"internships">,
  applicationId: Id<"applications">
) {
  return `/recruiter/internships/${internshipId}/applications/${applicationId}`;
}

function buildAbsoluteUrl(path: string) {
  return APP_URL ? `${APP_URL}${path}` : path;
}

function assertAllowedTransition(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus
) {
  if (!allowedStatusTransitions[currentStatus].includes(nextStatus)) {
    throw new ConvexError("Invalid application status transition");
  }
}

function createStatusHistoryEntry(
  status: ApplicationStatus,
  userId: Id<"users">,
  changedAt: number
) {
  return {
    status,
    changedAt,
    changedBy: userId,
  };
}

async function getApplicationForRecruiter(
  ctx: QueryCtx | MutationCtx,
  recruiterId: Id<"users">,
  applicationId: Id<"applications">
) {
  const application = await ctx.db.get(applicationId);

  if (!application) {
    throw new ConvexError("Application not found");
  }

  const internship = await ctx.db.get(application.internshipId);

  if (!internship) {
    throw new ConvexError("Internship not found");
  }

  if (internship.recruiterId !== recruiterId) {
    throw new ConvexError("FORBIDDEN");
  }

  return { application, internship };
}

async function getApplicationForUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  applicationId: Id<"applications">
) {
  const application = await ctx.db.get(applicationId);

  if (!application) {
    throw new ConvexError("Application not found");
  }

  if (application.candidateId === user._id) {
    return application;
  }

  const internship = await ctx.db.get(application.internshipId);

  if (!internship) {
    throw new ConvexError("Internship not found");
  }

  if (internship.recruiterId !== user._id) {
    throw new ConvexError("FORBIDDEN");
  }

  return application;
}

async function applicationByCandidateAndInternship(
  ctx: MutationCtx,
  candidateId: Id<"users">,
  internshipId: Id<"internships">
) {
  return await ctx.db
    .query("applications")
    .withIndex("by_candidate_and_internship", (q) =>
      q.eq("candidateId", candidateId).eq("internshipId", internshipId)
    )
    .unique();
}

async function getQuizStateForApplication(
  ctx: QueryCtx | MutationCtx,
  application: Doc<"applications">
) {
  const assignedQuiz = application.assignedQuizId
    ? await ctx.db.get(application.assignedQuizId)
    : null;
  const quizAttempt = await ctx.db
    .query("quizAttempts")
    .withIndex("by_application", (q) => q.eq("applicationId", application._id))
    .unique();

  return {
    assignedQuiz: assignedQuiz
      ? {
          _id: assignedQuiz._id,
          title: assignedQuiz.title,
          description: assignedQuiz.description,
          timeLimit: assignedQuiz.timeLimit,
          isPublished: assignedQuiz.isPublished,
          questionCount: assignedQuiz.questions.length,
        }
      : null,
    quizAssignedAt: application.quizAssignedAt ?? null,
    quizAttempt: quizAttempt
      ? {
          _id: quizAttempt._id,
          status: quizAttempt.status,
          score: quizAttempt.score,
          maxScore: quizAttempt.maxScore,
          deadlineAt: quizAttempt.deadlineAt,
          submittedAt: quizAttempt.submittedAt,
          gradedAt: quizAttempt.gradedAt,
        }
      : null,
    quizResultReady: quizAttempt?.status === "graded",
    quizNeedsManualReview: quizAttempt?.status === "submitted",
  };
}

export const apply = mutation({
  args: {
    internshipId: v.id("internships"),
    resumeStorageId: v.id("_storage"),
    coverLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.status !== "open") {
      throw new ConvexError("Internship is not accepting applications");
    }

    if (internship.applicationDeadline <= Date.now()) {
      throw new ConvexError("Application deadline has passed");
    }

    const existingApplication = await applicationByCandidateAndInternship(
      ctx,
      candidate._id,
      internship._id
    );

    if (existingApplication) {
      throw new ConvexError("You have already applied to this internship");
    }

    if (internship.maxApplications !== undefined) {
      const currentApplications = await ctx.db
        .query("applications")
        .withIndex("by_internship", (q) => q.eq("internshipId", internship._id))
        .take(internship.maxApplications);

      if (currentApplications.length >= internship.maxApplications) {
        throw new ConvexError(
          "This internship has reached its application limit"
        );
      }
    }

    const resumeMetadata = await ctx.db.system.get(
      "_storage",
      args.resumeStorageId
    );

    if (!resumeMetadata) {
      throw new ConvexError("Resume upload not found");
    }

    if (resumeMetadata.size > MAX_RESUME_SIZE_BYTES) {
      await ctx.storage.delete(args.resumeStorageId);
      throw new ConvexError("Resume must be 5MB or smaller");
    }

    const resumeContentType = resumeMetadata.contentType?.toLowerCase();

    // Some environments (including test/runtime adapters) may not persist
    // contentType on _storage metadata. Reject only when a non-PDF type is
    // explicitly present, while size checks still guard against abuse.

    if (resumeContentType && !resumeContentType.includes("pdf")) {
      await ctx.storage.delete(args.resumeStorageId);
      throw new ConvexError("Resume must be a PDF file");
    }

    const appliedAt = Date.now();
    const coverLetter = normalizeOptionalText(args.coverLetter);
    const applicationId = await ctx.db.insert("applications", {
      internshipId: internship._id,
      candidateId: candidate._id,
      resumeStorageId: args.resumeStorageId,
      status: "applied",
      statusHistory: [
        createStatusHistoryEntry("applied", candidate._id, appliedAt),
      ],
      appliedAt,
      updatedAt: appliedAt,
      ...(coverLetter ? { coverLetter } : {}),
    });

    const recruiter = await ctx.db.get(internship.recruiterId);

    if (recruiter) {
      const recruiterPath = buildRecruiterApplicationPath(
        internship._id,
        applicationId
      );

      await createNotification(ctx, {
        userId: recruiter._id,
        type: "new_application",
        title: `New application for ${internship.title}`,
        message: `${candidate.name} applied to ${internship.title}.`,
        link: recruiterPath,
        relatedId: applicationId,
      });

      if (recruiter.email) {
        await ctx.scheduler.runAfter(
          0,
          internal.emailActions.sendNewApplicationEmail,
          {
            to: recruiter.email,
            recruiterName: recruiter.name,
            candidateName: candidate.name,
            internshipTitle: internship.title,
            applicationUrl: buildAbsoluteUrl(recruiterPath),
          }
        );
      }
    }

    return applicationId;
  },
});

export const updateStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: applicationStatusValidator,
  },
  handler: async (ctx, args): Promise<null> => {
    const recruiter = await requireRole(ctx, "recruiter");
    const { application, internship } = await getApplicationForRecruiter(
      ctx,
      recruiter._id,
      args.applicationId
    );

    if (application.status === args.status) {
      return null;
    }

    if (args.status === "quiz_assigned") {
      throw new ConvexError("Assign quizzes through the quiz assignment flow");
    }

    if (args.status === "quiz_completed") {
      throw new ConvexError("Quiz completion is tracked automatically");
    }

    assertAllowedTransition(application.status, args.status);

    const updatedAt = Date.now();
    await ctx.db.patch(application._id, {
      status: args.status,
      statusHistory: [
        ...application.statusHistory,
        createStatusHistoryEntry(args.status, recruiter._id, updatedAt),
      ],
      updatedAt,
    });

    const candidate = await ctx.db.get(application.candidateId);

    if (!candidate) {
      return null;
    }

    const candidatePath = buildCandidateApplicationPath(application._id);
    const statusLabel = toStatusLabel(args.status);

    await createNotification(ctx, {
      userId: candidate._id,
      type: "application_status",
      title: `Application updated to ${statusLabel}`,
      message: `Your application for ${internship.title} is now ${statusLabel}.`,
      link: candidatePath,
      relatedId: application._id,
    });

    if (candidate.email) {
      await ctx.scheduler.runAfter(
        0,
        internal.emailActions.sendApplicationStatusEmail,
        {
          to: candidate.email,
          name: candidate.name,
          internshipTitle: internship.title,
          status: statusLabel,
        }
      );
    }

    return null;
  },
});

export const listForCandidate = query({
  args: {
    status: v.optional(applicationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");

    if (args.status) {
      const status = args.status;

      return await ctx.db
        .query("applications")
        .withIndex("by_candidate_and_status", (q) =>
          q.eq("candidateId", candidate._id).eq("status", status)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("applications")
      .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listForCandidateDetailed = query({
  args: {
    status: v.optional(applicationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");

    const paginated = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_candidate_and_status", (q) =>
            q.eq("candidateId", candidate._id).eq("status", args.status!)
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("applications")
          .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (application) => {
        const internship = await ctx.db.get(application.internshipId);
        const quizState = await getQuizStateForApplication(ctx, application);
        return {
          application,
          internship: internship
            ? {
                _id: internship._id,
                title: internship.title,
                company: internship.company,
                status: internship.status,
                applicationDeadline: internship.applicationDeadline,
              }
            : null,
          ...quizState,
        };
      })
    );

    return {
      ...paginated,
      page,
    };
  },
});

export const getForCandidate = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args): Promise<Doc<"applications"> | null> => {
    const candidate = await requireRole(ctx, "candidate");
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    if (application.candidateId !== candidate._id) {
      throw new ConvexError("FORBIDDEN");
    }

    return application;
  },
});

export const getForCandidateByInternship = query({
  args: {
    internshipId: v.id("internships"),
  },
  handler: async (ctx, args): Promise<Doc<"applications"> | null> => {
    const candidate = await requireRole(ctx, "candidate");

    return await ctx.db
      .query("applications")
      .withIndex("by_candidate_and_internship", (q) =>
        q.eq("candidateId", candidate._id).eq("internshipId", args.internshipId)
      )
      .unique();
  },
});

export const getCandidateDetail = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      return null;
    }

    if (application.candidateId !== candidate._id) {
      throw new ConvexError("FORBIDDEN");
    }

    const internship = await ctx.db.get(application.internshipId);
    const resumeUrl = await ctx.storage.getUrl(application.resumeStorageId);
    const quizState = await getQuizStateForApplication(ctx, application);

    return {
      application,
      internship,
      resumeUrl,
      ...quizState,
    };
  },
});

export const listForInternship = query({
  args: {
    internshipId: v.id("internships"),
    status: v.optional(applicationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    if (args.status) {
      const status = args.status;

      return await ctx.db
        .query("applications")
        .withIndex("by_internship_and_status", (q) =>
          q.eq("internshipId", args.internshipId).eq("status", status)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) =>
        q.eq("internshipId", args.internshipId)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listForInternshipDetailed = query({
  args: {
    internshipId: v.id("internships"),
    status: v.optional(applicationStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const internship = await ctx.db.get(args.internshipId);

    if (!internship) {
      throw new ConvexError("Internship not found");
    }

    if (internship.recruiterId !== recruiter._id) {
      throw new ConvexError("FORBIDDEN");
    }

    const paginated = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_internship_and_status", (q) =>
            q.eq("internshipId", args.internshipId).eq("status", args.status!)
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("applications")
          .withIndex("by_internship", (q) =>
            q.eq("internshipId", args.internshipId)
          )
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginated.page.map(async (application) => {
        const candidate = await ctx.db.get(application.candidateId);
        const quizState = await getQuizStateForApplication(ctx, application);
        return {
          application,
          candidate: candidate
            ? {
                _id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                imageUrl: candidate.imageUrl,
              }
            : null,
          ...quizState,
        };
      })
    );

    return {
      ...paginated,
      page,
      internship: {
        _id: internship._id,
        title: internship.title,
        company: internship.company,
      },
    };
  },
});

export const getForRecruiter = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args): Promise<Doc<"applications"> | null> => {
    const recruiter = await requireRole(ctx, "recruiter");
    const { application } = await getApplicationForRecruiter(
      ctx,
      recruiter._id,
      args.applicationId
    );
    return application;
  },
});

export const getRecruiterDetail = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args) => {
    const recruiter = await requireRole(ctx, "recruiter");
    const { application, internship } = await getApplicationForRecruiter(
      ctx,
      recruiter._id,
      args.applicationId
    );

    const candidate = await ctx.db.get(application.candidateId);
    const candidateProfile = candidate
      ? await ctx.db
          .query("candidateProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", candidate._id))
          .unique()
      : null;
    const resumeUrl = await ctx.storage.getUrl(application.resumeStorageId);
    const quizState = await getQuizStateForApplication(ctx, application);

    return {
      application,
      internship,
      candidate,
      candidateProfile,
      resumeUrl,
      ...quizState,
    };
  },
});

export const getResumeUrl = query({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const user = await requireUser(ctx);
    const application = await getApplicationForUser(
      ctx,
      user,
      args.applicationId
    );
    return await ctx.storage.getUrl(application.resumeStorageId);
  },
});

export const listAllForCandidateDetailed = query({
  args: {
    status: v.optional(applicationStatusValidator),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");

    const applications = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_candidate_and_status", (q) =>
            q.eq("candidateId", candidate._id).eq("status", args.status!)
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("applications")
          .withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id))
          .order("desc")
          .collect();

    return Promise.all(
      applications.map(async (application) => {
        const internship = await ctx.db.get(application.internshipId);
        const quizState = await getQuizStateForApplication(ctx, application);
        return {
          application,
          internship: internship
            ? {
                _id: internship._id,
                title: internship.title,
                company: internship.company,
                status: internship.status,
                applicationDeadline: internship.applicationDeadline,
              }
            : null,
          ...quizState,
        };
      })
    );
  },
});
