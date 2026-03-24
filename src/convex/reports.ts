import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { QueryCtx, mutation, query } from "@/convex/_generated/server";
import { requireAnyRole, requireRole } from "@/convex/lib/auth";
import {
  closeInternshipByAdmin,
  suspendUserByAdmin,
  unpublishBlogPostByAdmin,
} from "@/convex/lib/moderation";

const reportTargetTypeValidator = v.union(
  v.literal("internship"),
  v.literal("user"),
  v.literal("blog_post")
);

const reportReasonValidator = v.union(
  v.literal("spam"),
  v.literal("misleading_information"),
  v.literal("inappropriate_content"),
  v.literal("fraud_or_scam"),
  v.literal("harassment"),
  v.literal("other")
);

const reportStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("resolved"),
  v.literal("dismissed")
);

const reportActionTypeValidator = v.union(
  v.literal("close_internship"),
  v.literal("unpublish_blog_post"),
  v.literal("suspend_user")
);

function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const create = mutation({
  args: {
    targetType: reportTargetTypeValidator,
    targetId: v.string(),
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporter = await requireAnyRole(ctx, ["candidate", "recruiter"]);
    const existing = await ctx.db
      .query("reports")
      .withIndex("by_reporter_and_target_and_status", (q) =>
        q
          .eq("reporterId", reporter._id)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
          .eq("status", "pending")
      )
      .unique();

    if (existing) {
      throw new ConvexError(
        "You already have a pending report for this content"
      );
    }

    if (args.targetType === "internship") {
      const internship = await ctx.db.get(args.targetId as Id<"internships">);

      if (!internship) {
        throw new ConvexError("Internship not found");
      }
    } else if (args.targetType === "blog_post") {
      const post = await ctx.db.get(args.targetId as Id<"blogPosts">);

      if (!post) {
        throw new ConvexError("Blog post not found");
      }
    } else {
      const user = await ctx.db.get(args.targetId as Id<"users">);

      if (!user) {
        throw new ConvexError("User not found");
      }
    }

    await ctx.db.insert("reports", {
      reporterId: reporter._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      ...(trimOptional(args.details)
        ? { details: trimOptional(args.details) }
        : {}),
      status: "pending",
      createdAt: Date.now(),
    });

    return null;
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(reportStatusValidator),
    targetType: v.optional(reportTargetTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const reports = args.status
      ? args.targetType
        ? await ctx.db
            .query("reports")
            .withIndex("by_target_type_and_status", (q) =>
              q.eq("targetType", args.targetType!).eq("status", args.status!)
            )
            .order("desc")
            .collect()
        : await ctx.db
            .query("reports")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .collect()
      : args.targetType
        ? await ctx.db
            .query("reports")
            .withIndex("by_targetType", (q) =>
              q.eq("targetType", args.targetType!)
            )
            .order("desc")
            .collect()
        : await ctx.db.query("reports").order("desc").collect();

    const reporters = await Promise.all(
      reports.map((report) => ctx.db.get(report.reporterId))
    );
    const reporterMap = new Map(
      reporters.filter(Boolean).map((reporter) => [reporter!._id, reporter!])
    );

    const hydrated = await Promise.all(
      reports.map(async (report) => ({
        ...report,
        reporter: reporterMap.get(report.reporterId) ?? null,
        target: await getAdminTargetSummary(ctx, report),
      }))
    );

    return hydrated.sort((left, right) => {
      const statusRank =
        REPORT_STATUS_SORT_ORDER[left.status] -
        REPORT_STATUS_SORT_ORDER[right.status];

      if (statusRank !== 0) {
        return statusRank;
      }

      return right.createdAt - left.createdAt;
    });
  },
});

export const getForAdmin = query({
  args: {
    reportId: v.id("reports"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const report = await ctx.db.get(args.reportId);

    if (!report) {
      return null;
    }

    const reporter = await ctx.db.get(report.reporterId);

    return {
      ...report,
      reporter,
      target: await getAdminTargetDetail(ctx, report),
    };
  },
});

const REPORT_STATUS_SORT_ORDER: Record<Doc<"reports">["status"], number> = {
  pending: 0,
  reviewed: 1,
  resolved: 2,
  dismissed: 3,
};

function buildActionSummary(
  actionType: Doc<"reports">["actionType"] | undefined
) {
  if (!actionType) {
    return undefined;
  }

  return toDisplayLabel(actionType);
}

export const review = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    notes: v.optional(v.string()),
    actionType: v.optional(reportActionTypeValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const report = await ctx.db.get(args.reportId);

    if (!report) {
      throw new ConvexError("Report not found");
    }

    if (args.status !== "resolved" && args.actionType) {
      throw new ConvexError(
        "Moderation actions can only be applied when resolving a report"
      );
    }

    if (args.status === "dismissed" && args.actionType) {
      throw new ConvexError(
        "Dismissed reports cannot apply moderation actions"
      );
    }

    if (args.status === "resolved" && args.actionType) {
      if (
        (report.targetType === "internship" &&
          args.actionType !== "close_internship") ||
        (report.targetType === "blog_post" &&
          args.actionType !== "unpublish_blog_post") ||
        (report.targetType === "user" && args.actionType !== "suspend_user")
      ) {
        throw new ConvexError(
          "This moderation action does not match the report target"
        );
      }

      if (args.actionType === "close_internship") {
        await closeInternshipByAdmin(
          ctx,
          admin._id,
          report.targetId as Id<"internships">,
          args.notes
        );
      } else if (args.actionType === "unpublish_blog_post") {
        await unpublishBlogPostByAdmin(ctx, report.targetId as Id<"blogPosts">);
      } else if (args.actionType === "suspend_user") {
        await suspendUserByAdmin(
          ctx,
          admin._id,
          report.targetId as Id<"users">,
          args.notes
        );
      }
    }

    await ctx.db.patch(report._id, {
      status: args.status,
      reviewedBy: admin._id,
      reviewedAt: Date.now(),
      ...(trimOptional(args.notes)
        ? { reviewNotes: trimOptional(args.notes) }
        : {}),
      ...(args.actionType ? { actionType: args.actionType } : {}),
      ...(buildActionSummary(args.actionType)
        ? { actionSummary: buildActionSummary(args.actionType) }
        : {}),
    });

    return null;
  },
});

async function getAdminTargetSummary(ctx: QueryCtx, report: Doc<"reports">) {
  if (report.targetType === "internship") {
    const internship = await ctx.db.get(report.targetId as Id<"internships">);

    if (!internship) {
      return null;
    }

    return {
      type: report.targetType,
      title: internship.title,
      subtitle: internship.company,
      status: internship.status,
    };
  }

  if (report.targetType === "blog_post") {
    const post = await ctx.db.get(report.targetId as Id<"blogPosts">);

    if (!post) {
      return null;
    }

    return {
      type: report.targetType,
      title: post.title,
      subtitle: post.excerpt,
      status: post.status,
    };
  }

  const user = await ctx.db.get(report.targetId as Id<"users">);

  if (!user) {
    return null;
  }

  return {
    type: report.targetType,
    title: user.name,
    subtitle: user.email,
    status: user.isSuspended === true ? "suspended" : (user.role ?? "unknown"),
  };
}

async function getAdminTargetDetail(ctx: QueryCtx, report: Doc<"reports">) {
  if (report.targetType === "internship") {
    const internship = await ctx.db.get(report.targetId as Id<"internships">);

    if (!internship) {
      return null;
    }

    const recruiter = await ctx.db.get(internship.recruiterId);

    return {
      type: report.targetType,
      internship,
      recruiter,
    };
  }

  if (report.targetType === "blog_post") {
    const post = await ctx.db.get(report.targetId as Id<"blogPosts">);

    if (!post) {
      return null;
    }

    const author = await ctx.db.get(post.authorId);

    return {
      type: report.targetType,
      post,
      author,
    };
  }

  const user = await ctx.db.get(report.targetId as Id<"users">);

  if (!user) {
    return null;
  }

  return {
    type: report.targetType,
    user,
  };
}
