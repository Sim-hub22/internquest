import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
    isSuspended: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createInternshipSeed(recruiterId: Id<"users">) {
  const now = Date.now();

  return {
    recruiterId,
    title: "Reportable Internship",
    company: "InternQuest",
    description: "desc",
    category: "technology" as const,
    location: "Kathmandu",
    locationType: "remote" as const,
    duration: "3 months",
    requirements: ["TypeScript"],
    status: "open" as const,
    applicationDeadline: now + 10 * 24 * 60 * 60 * 1000,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createBlogPostSeed(authorId: Id<"users">) {
  const now = Date.now();

  return {
    authorId,
    title: "Reportable Resource",
    slug: "reportable-resource",
    content: "<p>content</p>",
    excerpt: "excerpt",
    category: "general" as const,
    tags: ["tips"],
    status: "published" as const,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/reports", () => {
  it("prevents duplicate pending reports for the same reporter and target", async () => {
    const t = convexTest(schema, modules);
    const reporterIdentity = { subject: "candidate_reporter_duplicate" };

    const internshipId = await t.run(async (ctx) => {
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed("recruiter_report_target", "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(reporterIdentity.subject, "candidate")
      );

      return await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId)
      );
    });

    await t.withIdentity(reporterIdentity).mutation(api.reports.create, {
      targetType: "internship",
      targetId: internshipId,
      reason: "spam",
    });

    await expect(
      t.withIdentity(reporterIdentity).mutation(api.reports.create, {
        targetType: "internship",
        targetId: internshipId,
        reason: "other",
      })
    ).rejects.toThrow("pending report");
  });

  it("restricts admin review queries to admins", async () => {
    const t = convexTest(schema, modules);
    const candidateIdentity = { subject: "candidate_report_guard" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
    });

    await expect(t.query(api.reports.listForAdmin, {})).rejects.toThrow(
      "UNAUTHENTICATED"
    );
    await expect(
      t.withIdentity(candidateIdentity).query(api.reports.listForAdmin, {})
    ).rejects.toThrow("FORBIDDEN");
  });

  it("resolves internship reports by closing the listing", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_report_close" };
    const candidateIdentity = { subject: "candidate_report_close" };

    const reportId = await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      const recruiterId = await ctx.db.insert(
        "users",
        createUserSeed("recruiter_report_close", "recruiter")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
      const internshipId = await ctx.db.insert(
        "internships",
        createInternshipSeed(recruiterId)
      );

      return await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "internship",
        targetId: internshipId,
        reason: "fraud_or_scam",
        status: "pending",
        createdAt: Date.now(),
      });
    });

    await t.withIdentity(adminIdentity).mutation(api.reports.review, {
      reportId,
      status: "resolved",
      actionType: "close_internship",
      notes: "Confirmed policy violation",
    });

    const detail = await t
      .withIdentity(adminIdentity)
      .query(api.reports.getForAdmin, {
        reportId,
      });

    expect(detail?.status).toBe("resolved");
    expect(detail?.actionType).toBe("close_internship");
    expect(detail?.target?.type).toBe("internship");
    if (detail?.target?.type === "internship") {
      expect(detail.target.internship.status).toBe("closed");
      expect(detail.target.internship.isClosedByAdmin).toBe(true);
    }
  });

  it("resolves blog post reports by unpublishing the post", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_report_blog" };
    const candidateIdentity = { subject: "candidate_report_blog" };
    const reportId = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      const candidateId = await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate")
      );
      const authorId = await ctx.db.insert(
        "users",
        createUserSeed("admin_blog_author_report", "admin")
      );
      const postId = await ctx.db.insert(
        "blogPosts",
        createBlogPostSeed(authorId)
      );

      expect(adminId).toBeTruthy();

      return await ctx.db.insert("reports", {
        reporterId: candidateId,
        targetType: "blog_post",
        targetId: postId,
        reason: "inappropriate_content",
        status: "pending",
        createdAt: Date.now(),
      });
    });

    await t.withIdentity(adminIdentity).mutation(api.reports.review, {
      reportId,
      status: "resolved",
      actionType: "unpublish_blog_post",
    });

    const detail = await t
      .withIdentity(adminIdentity)
      .query(api.reports.getForAdmin, {
        reportId,
      });

    expect(detail?.status).toBe("resolved");
    expect(detail?.actionType).toBe("unpublish_blog_post");
    if (detail?.target?.type === "blog_post") {
      expect(detail.target.post.status).toBe("draft");
    }
  });
});
