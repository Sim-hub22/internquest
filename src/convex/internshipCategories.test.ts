import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
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

function createInternshipArgs(category: string) {
  return {
    title: "Project Management Intern",
    company: "InternQuest",
    description: "Coordinate cross-functional internship delivery work.",
    category,
    categories: [category],
    location: "Kathmandu",
    locationType: "remote" as const,
    duration: "3 months",
    stipend: undefined,
    requirements: ["Communication"],
    status: "draft" as const,
    applicationDeadline: Date.now() + 10 * 24 * 60 * 60 * 1000,
    maxApplications: undefined,
  };
}

describe("convex/internshipCategories", () => {
  it("lists built-in approved categories for public use", async () => {
    const t = convexTest(schema, modules);

    const categories = await t.query(api.internshipCategories.listApproved, {});

    expect(categories.map((category) => category.slug)).toContain("technology");
    expect(categories.map((category) => category.slug)).not.toContain("other");
    expect(categories.every((category) => category.status === "approved")).toBe(
      true
    );
  });

  it("does not expose retired built-in categories from existing rows", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("internshipCategories", {
        name: "Other",
        slug: "other",
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const categories = await t.query(api.internshipCategories.listApproved, {});

    expect(categories.map((category) => category.slug)).not.toContain("other");
  });

  it("allows recruiters to request categories and merges duplicate slugs", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_category_1" };
    const adminOneIdentity = { subject: "admin_category_1a" };
    const adminTwoIdentity = { subject: "admin_category_1b" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminOneIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminTwoIdentity.subject, "admin")
      );
    });

    const firstRequest = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "Project Management",
      });
    const duplicateRequest = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: " project   management ",
      });

    expect(firstRequest?.slug).toBe("project-management");
    expect(duplicateRequest?._id).toBe(firstRequest?._id);

    const adminOneNotifications = await t
      .withIdentity(adminOneIdentity)
      .query(api.notifications.listUnread, {});
    const adminTwoNotifications = await t
      .withIdentity(adminTwoIdentity)
      .query(api.notifications.listUnread, {});

    expect(adminOneNotifications).toHaveLength(1);
    expect(adminTwoNotifications).toHaveLength(1);
    expect(adminOneNotifications[0]).toMatchObject({
      type: "category_request",
      title: "New category request",
      link: "/admin/categories",
      relatedId: firstRequest?._id,
    });
  });

  it("notifies admins when a rejected category request is resubmitted", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_category_resubmit" };
    const adminIdentity = { subject: "admin_category_resubmit" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const request = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "Data Science",
      });

    await t
      .withIdentity(adminIdentity)
      .mutation(api.notifications.markAllAsRead, {});
    await t
      .withIdentity(adminIdentity)
      .mutation(api.internshipCategories.review, {
        categoryId: request!._id,
        status: "rejected",
      });
    await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "Data Science",
      });

    const notifications = await t
      .withIdentity(adminIdentity)
      .query(api.notifications.listUnread, {});

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "category_request",
      link: "/admin/categories",
      relatedId: request?._id,
    });
  });

  it("notifies the requesting recruiter when a category is approved", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_category_approved" };
    const adminIdentity = { subject: "admin_category_approved" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const request = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "Data Science",
      });

    await t
      .withIdentity(adminIdentity)
      .mutation(api.internshipCategories.review, {
        categoryId: request!._id,
        status: "approved",
      });

    const notifications = await t
      .withIdentity(recruiterIdentity)
      .query(api.notifications.listUnread, {});

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "category_review",
      title: "Category request approved",
      link: "/recruiter/internships/new",
      relatedId: request?._id,
    });
    expect(notifications[0]?.message).toContain("Data Science");
  });

  it("notifies the requesting recruiter when a category is rejected with admin notes", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_category_rejected" };
    const adminIdentity = { subject: "admin_category_rejected" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const request = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "AI",
      });

    await t
      .withIdentity(adminIdentity)
      .mutation(api.internshipCategories.review, {
        categoryId: request!._id,
        status: "rejected",
        adminNotes: "Please use Technology instead.",
      });

    const notifications = await t
      .withIdentity(recruiterIdentity)
      .query(api.notifications.listUnread, {});

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "category_review",
      title: "Category request rejected",
      link: "/recruiter/internships/new",
      relatedId: request?._id,
    });
    expect(notifications[0]?.message).toContain(
      "Please use Technology instead."
    );
  });

  it("requires admin review before custom categories can be used", async () => {
    const t = convexTest(schema, modules);
    const recruiterIdentity = { subject: "recruiter_category_2" };
    const adminIdentity = { subject: "admin_category_2" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
    });

    const request = await t
      .withIdentity(recruiterIdentity)
      .mutation(api.internshipCategories.request, {
        name: "Project Management",
      });

    await expect(
      t
        .withIdentity(recruiterIdentity)
        .mutation(
          api.internships.create,
          createInternshipArgs("project-management")
        )
    ).rejects.toThrow("not an approved internship category");

    await expect(
      t
        .withIdentity(recruiterIdentity)
        .mutation(api.internshipCategories.review, {
          categoryId: request!._id,
          status: "approved",
        })
    ).rejects.toThrow("FORBIDDEN");

    await t
      .withIdentity(adminIdentity)
      .mutation(api.internshipCategories.review, {
        categoryId: request!._id,
        status: "approved",
      });

    const approvedCategories = await t.query(
      api.internshipCategories.listApproved,
      {}
    );
    expect(approvedCategories.map((category) => category.slug)).toContain(
      "project-management"
    );

    const internshipId = await t
      .withIdentity(recruiterIdentity)
      .mutation(
        api.internships.create,
        createInternshipArgs("project-management")
      );

    expect(internshipId).toBeTruthy();
  });
});
