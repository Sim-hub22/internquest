import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules } from "@/convex/test.setup";

function createUserSeed(
  clerkId: string,
  role: "candidate" | "recruiter" | "admin",
  email = ""
) {
  const now = Date.now();

  return {
    clerkId,
    username: clerkId,
    name: `${clerkId} name`,
    email,
    role,
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe("convex/blogPosts", () => {
  it("lets admins create drafts, publish, and unpublish while blocking non-admin access", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_blog_owner" };
    const recruiterIdentity = { subject: "recruiter_blog_denied" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter")
      );
    });

    await expect(
      t.withIdentity(recruiterIdentity).mutation(api.blogPosts.create, {
        title: "Recruiter should fail",
        slug: "recruiter-should-fail",
        excerpt: "No access",
        content: "<p>No access</p>",
        category: "general",
        tags: [],
      })
    ).rejects.toThrow("FORBIDDEN");

    const postId = await t
      .withIdentity(adminIdentity)
      .mutation(api.blogPosts.create, {
        title: "   ",
        slug: "   ",
        excerpt: "",
        content: "",
        category: "career_tips",
        tags: [" first draft "],
        draft: true,
      });

    const draftPost = await t
      .withIdentity(adminIdentity)
      .query(api.blogPosts.getForAdmin, {
        postId,
      });

    expect(draftPost.title).toBe("Untitled resource");
    expect(draftPost.status).toBe("draft");

    await t.withIdentity(adminIdentity).mutation(api.blogPosts.update, {
      postId,
      title: "Interview Ready Checklist",
      slug: "Interview Ready Checklist",
      excerpt: "A practical rundown for calmer interview prep.",
      content: "<p>Bring stories, questions, and a calm opening line.</p>",
      category: "interview_prep",
      tags: ["interviews", "prep"],
    });

    await t.withIdentity(adminIdentity).mutation(api.blogPosts.publish, {
      postId,
    });

    const published = await t.query(api.blogPosts.getBySlug, {
      slug: "interview-ready-checklist",
    });
    expect(published?.status).toBe("published");

    await t.withIdentity(adminIdentity).mutation(api.blogPosts.unpublish, {
      postId,
    });

    const hidden = await t.query(api.blogPosts.getBySlug, {
      slug: "interview-ready-checklist",
    });
    expect(hidden).toBeNull();
  });

  it("rejects duplicate slugs and keeps owner preview private", async () => {
    const t = convexTest(schema, modules);
    const ownerIdentity = { subject: "admin_blog_preview_owner" };
    const otherAdminIdentity = { subject: "admin_blog_preview_other" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(ownerIdentity.subject, "admin")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(otherAdminIdentity.subject, "admin")
      );
    });

    const postId = await t
      .withIdentity(ownerIdentity)
      .mutation(api.blogPosts.create, {
        title: "Resume Rewrite Notes",
        slug: "Resume Rewrite Notes",
        excerpt: "Tighten your story before you apply.",
        content: "<p>Lead with outcomes, not task lists.</p>",
        category: "resume_guide",
        tags: ["resume"],
        draft: true,
      });

    await expect(
      t.withIdentity(otherAdminIdentity).mutation(api.blogPosts.create, {
        title: "Another resume note",
        slug: "Resume Rewrite Notes",
        excerpt: "Should fail",
        content: "<p>Duplicate slug</p>",
        category: "resume_guide",
        tags: [],
        draft: true,
      })
    ).rejects.toThrow("That slug is already in use");

    const preview = await t
      .withIdentity(ownerIdentity)
      .query(api.blogPosts.getOwnerPreview, { postId });
    expect(preview.post.slug).toBe("resume-rewrite-notes");

    await expect(
      t.withIdentity(otherAdminIdentity).query(api.blogPosts.getOwnerPreview, {
        postId,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("only exposes published resources publicly and creates notifications on first publish", async () => {
    const t = convexTest(schema, modules);
    const adminIdentity = { subject: "admin_blog_publish" };
    const candidateIdentity = { subject: "candidate_blog_notifications" };
    const recruiterIdentity = { subject: "recruiter_blog_notifications" };

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "users",
        createUserSeed(adminIdentity.subject, "admin", "")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(candidateIdentity.subject, "candidate", "")
      );
      await ctx.db.insert(
        "users",
        createUserSeed(recruiterIdentity.subject, "recruiter", "")
      );
    });

    const draftId = await t
      .withIdentity(adminIdentity)
      .mutation(api.blogPosts.create, {
        title: "Hidden Draft",
        slug: "Hidden Draft",
        excerpt: "Still private",
        content: "<p>Draft content</p>",
        category: "general",
        tags: [],
        draft: true,
      });

    const publishedId = await t
      .withIdentity(adminIdentity)
      .mutation(api.blogPosts.create, {
        title: "Interview Day Blueprint",
        slug: "Interview Day Blueprint",
        excerpt: "A step-by-step plan for interview day.",
        content: "<p>Arrive early, bring proof, and prepare examples.</p>",
        category: "interview_prep",
        tags: ["interview day", "confidence"],
      });

    await t.withIdentity(adminIdentity).mutation(api.blogPosts.publish, {
      postId: publishedId,
    });

    const publicList = await t.query(api.blogPosts.listPublic, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const publicSearch = await t.query(api.blogPosts.searchPublic, {
      query: "Interview Day",
      paginationOpts: { numItems: 10, cursor: null },
    });
    const hiddenDraft = await t.query(api.blogPosts.getBySlug, {
      slug: "hidden-draft",
    });
    const candidateNotifications = await t
      .withIdentity(candidateIdentity)
      .query(api.notifications.listUnread, {});

    expect(publicList.page.map((post) => post._id)).toContain(publishedId);
    expect(publicList.page.map((post) => post._id)).not.toContain(draftId);
    expect(publicSearch.page.map((post) => post._id)).toContain(publishedId);
    expect(hiddenDraft).toBeNull();
    expect(
      candidateNotifications.some(
        (item) =>
          item.type === "new_resource" &&
          item.link === "/resources/interview-day-blueprint"
      )
    ).toBe(true);
  });
});
