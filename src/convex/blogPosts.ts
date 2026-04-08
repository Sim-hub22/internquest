import { ConvexError, v } from "convex/values";

import { internal } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { requireRole } from "@/convex/lib/auth";
import { createNotification } from "@/convex/lib/notifications";
import {
  BLOG_CATEGORIES,
  hasMeaningfulRichText,
  normalizeOptionalText,
  normalizeTags,
  slugifyPostTitle,
} from "@/lib/blog";

const blogCategoryValidator = v.union(
  v.literal("career_tips"),
  v.literal("interview_prep"),
  v.literal("industry_insights"),
  v.literal("resume_guide"),
  v.literal("general")
);

const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
  id: v.optional(v.number()),
});

const APP_URL = process.env.APP_URL?.replace(/\/$/, "") ?? "";

function buildPostPath(slug: string) {
  return `/resources/${slug}`;
}

function buildPostUrl(slug: string) {
  const path = buildPostPath(slug);
  return APP_URL ? `${APP_URL}${path}` : path;
}

function getDraftTitle(title: string) {
  return normalizeOptionalText(title) ?? "Untitled resource";
}

function createDraftSlug() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSlug(value: string) {
  return slugifyPostTitle(value);
}

async function assertUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  excludePostId?: Id<"blogPosts">
) {
  const existing = await ctx.db
    .query("blogPosts")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== excludePostId) {
    throw new ConvexError("That slug is already in use");
  }
}

async function resolveCoverImageUrl(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage"> | undefined
) {
  if (!storageId) {
    return null;
  }

  return await ctx.storage.getUrl(storageId);
}

async function assertValidCoverImage(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage"> | undefined
) {
  if (!storageId) {
    return null;
  }

  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) {
    throw new ConvexError("Cover image not found");
  }

  const coverImageContentType = metadata.contentType?.toLowerCase();

  // Some runtimes used in tests may not persist contentType on _storage
  // metadata. Reject only when an explicit non-image type is present.
  if (coverImageContentType && !coverImageContentType.startsWith("image/")) {
    throw new ConvexError("Cover image must be an image");
  }

  return metadata;
}

function validateForPublish(post: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
}) {
  if (!normalizeOptionalText(post.title)) {
    throw new ConvexError("Post title is required");
  }

  if (!normalizeOptionalText(post.slug)) {
    throw new ConvexError("Post slug is required");
  }

  if (!normalizeOptionalText(post.excerpt)) {
    throw new ConvexError("Post excerpt is required");
  }

  if (!hasMeaningfulRichText(post.content)) {
    throw new ConvexError("Post content is required");
  }
}

function buildPostDocument(args: {
  authorId: Id<"users">;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: (typeof BLOG_CATEGORIES)[number];
  tags: string[];
  coverImageStorageId?: Id<"_storage">;
  status: "draft" | "published";
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    authorId: args.authorId,
    title: args.title,
    slug: args.slug,
    content: args.content,
    excerpt: args.excerpt,
    category: args.category,
    tags: args.tags,
    status: args.status,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    ...(args.coverImageStorageId
      ? { coverImageStorageId: args.coverImageStorageId }
      : {}),
    ...(args.publishedAt ? { publishedAt: args.publishedAt } : {}),
  };
}

async function getPostForOwner(
  ctx: QueryCtx | MutationCtx,
  adminId: Id<"users">,
  postId: Id<"blogPosts">
) {
  const post = await ctx.db.get(postId);

  if (!post) {
    throw new ConvexError("Post not found");
  }

  if (post.authorId !== adminId) {
    throw new ConvexError("FORBIDDEN");
  }

  return post;
}

async function toPostSummary(
  ctx: QueryCtx | MutationCtx,
  post: Doc<"blogPosts">
) {
  return {
    _id: post._id,
    _creationTime: post._creationTime,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    coverImageUrl: await resolveCoverImageUrl(ctx, post.coverImageStorageId),
  };
}

async function fanOutPublishedResourceNotifications(
  ctx: MutationCtx,
  post: Doc<"blogPosts">
) {
  const [candidateUsers, recruiterUsers] = await Promise.all([
    ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "candidate"))
      .collect(),
    ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "recruiter"))
      .collect(),
  ]);
  const users = [...candidateUsers, ...recruiterUsers];
  const postPath = buildPostPath(post.slug);
  const postUrl = buildPostUrl(post.slug);

  for (const user of users) {
    await createNotification(ctx, {
      userId: user._id,
      type: "new_resource",
      title: `New resource: ${post.title}`,
      message: post.excerpt,
      link: postPath,
      relatedId: post._id,
    });

    if (!user.email) {
      continue;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.emailActions.sendNewResourceEmail,
      {
        to: user.email,
        name: user.name,
        postTitle: post.title,
        postExcerpt: post.excerpt,
        postUrl,
      }
    );
  }
}

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: blogCategoryValidator,
    tags: v.array(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    draft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const isDraft = args.draft ?? false;
    const title = normalizeOptionalText(args.title);
    const slug = normalizeSlug(args.slug);
    const excerpt = normalizeOptionalText(args.excerpt) ?? "";
    const content = args.content.trim();
    const tags = normalizeTags(args.tags);

    if (!isDraft) {
      validateForPublish({
        title: title ?? "",
        slug,
        excerpt,
        content,
      });
    }

    const finalSlug = slug || createDraftSlug();
    await assertUniqueSlug(ctx, finalSlug);
    await assertValidCoverImage(ctx, args.coverImageStorageId);

    const now = Date.now();
    return await ctx.db.insert(
      "blogPosts",
      buildPostDocument({
        authorId: admin._id,
        title: isDraft ? getDraftTitle(args.title) : title!,
        slug: finalSlug,
        excerpt,
        content,
        category: args.category,
        tags,
        coverImageStorageId: args.coverImageStorageId,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      })
    );
  },
});

export const update = mutation({
  args: {
    postId: v.id("blogPosts"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: blogCategoryValidator,
    tags: v.array(v.string()),
    coverImageStorageId: v.optional(v.id("_storage")),
    draft: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireRole(ctx, "admin");
    const existing = await getPostForOwner(ctx, admin._id, args.postId);
    const isDraft = args.draft ?? existing.status === "draft";
    const title = normalizeOptionalText(args.title);
    const slug = normalizeSlug(args.slug);
    const excerpt = normalizeOptionalText(args.excerpt) ?? "";
    const content = args.content.trim();
    const tags = normalizeTags(args.tags);

    const finalSlug =
      slug || (existing.status === "draft" ? createDraftSlug() : "");

    if (!isDraft) {
      validateForPublish({
        title: title ?? "",
        slug: finalSlug,
        excerpt,
        content,
      });
    }

    await assertUniqueSlug(ctx, finalSlug, existing._id);
    await assertValidCoverImage(ctx, args.coverImageStorageId);

    await ctx.db.replace(args.postId, {
      ...buildPostDocument({
        authorId: existing.authorId,
        title: isDraft ? getDraftTitle(args.title) : title!,
        slug: finalSlug,
        excerpt,
        content,
        category: args.category,
        tags,
        coverImageStorageId: args.coverImageStorageId,
        status: existing.status,
        publishedAt: existing.publishedAt,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      }),
    });

    return null;
  },
});

export const publish = mutation({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireRole(ctx, "admin");
    const existing = await getPostForOwner(ctx, admin._id, args.postId);

    const title = normalizeOptionalText(existing.title);
    const slug = normalizeSlug(existing.slug);
    const excerpt = normalizeOptionalText(existing.excerpt) ?? "";
    const content = existing.content.trim();
    const publishedTitle = title ?? "";

    validateForPublish({
      title: publishedTitle,
      slug,
      excerpt,
      content,
    });

    await assertUniqueSlug(ctx, slug, existing._id);
    await assertValidCoverImage(ctx, existing.coverImageStorageId);

    const now = Date.now();
    const publishedAt = existing.publishedAt ?? now;
    await ctx.db.replace(args.postId, {
      ...buildPostDocument({
        authorId: existing.authorId,
        title: publishedTitle,
        slug,
        excerpt,
        content,
        category: existing.category,
        tags: normalizeTags(existing.tags),
        coverImageStorageId: existing.coverImageStorageId,
        status: "published",
        publishedAt,
        createdAt: existing.createdAt,
        updatedAt: now,
      }),
    });

    if (existing.publishedAt === undefined) {
      await fanOutPublishedResourceNotifications(ctx, {
        ...existing,
        title: publishedTitle,
        slug,
        excerpt,
        content,
        tags: normalizeTags(existing.tags),
        publishedAt,
        status: "published",
        updatedAt: now,
      });
    }

    return null;
  },
});

export const unpublish = mutation({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireRole(ctx, "admin");
    const existing = await getPostForOwner(ctx, admin._id, args.postId);

    if (existing.status === "draft") {
      return null;
    }

    await ctx.db.replace(args.postId, {
      ...buildPostDocument({
        authorId: existing.authorId,
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt,
        content: existing.content,
        category: existing.category,
        tags: existing.tags,
        coverImageStorageId: existing.coverImageStorageId,
        status: "draft",
        publishedAt: existing.publishedAt,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      }),
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args): Promise<null> => {
    const admin = await requireRole(ctx, "admin");
    const existing = await getPostForOwner(ctx, admin._id, args.postId);

    if (existing.coverImageStorageId) {
      await ctx.storage.delete(existing.coverImageStorageId);
    }

    await ctx.db.delete(args.postId);

    return null;
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, "admin");
    const posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_author", (q) => q.eq("authorId", admin._id))
      .order("desc")
      .collect();

    return await Promise.all(posts.map((post) => toPostSummary(ctx, post)));
  },
});

export const getForAdmin = query({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const post = await getPostForOwner(ctx, admin._id, args.postId);

    return {
      ...post,
      coverImageUrl: await resolveCoverImageUrl(ctx, post.coverImageStorageId),
    };
  },
});

export const getBreadcrumbLabel = query({
  args: {
    postId: v.id("blogPosts"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin").catch(() => null);

    if (!admin) {
      return null;
    }

    const post = await ctx.db.get(args.postId);

    if (!post || post.authorId !== admin._id) {
      return null;
    }

    return post.title;
  },
});

export const getOwnerPreview = query({
  args: {
    postId: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const post = await getPostForOwner(ctx, admin._id, args.postId);

    return {
      post: {
        ...post,
        coverImageUrl: await resolveCoverImageUrl(
          ctx,
          post.coverImageStorageId
        ),
      },
    };
  },
});

export const listPublic = query({
  args: {
    category: v.optional(blogCategoryValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = args.category
      ? await ctx.db
          .query("blogPosts")
          .withIndex("by_category_and_status_and_publishedAt", (q) =>
            q.eq("category", args.category!).eq("status", "published")
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("blogPosts")
          .withIndex("by_status_and_publishedAt", (q) =>
            q.eq("status", "published")
          )
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map((post) => toPostSummary(ctx, post))
      ),
    };
  },
});

export const searchPublic = query({
  args: {
    query: v.string(),
    category: v.optional(blogCategoryValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim();

    if (!searchTerm) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const results = await ctx.db
      .query("blogPosts")
      .withSearchIndex("search_posts", (q) => {
        let scoped = q.search("title", searchTerm).eq("status", "published");

        if (args.category) {
          scoped = scoped.eq("category", args.category);
        }

        return scoped;
      })
      .paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map((post) => toPostSummary(ctx, post))
      ),
    };
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", normalizeSlug(args.slug)))
      .unique();

    if (!post || post.status !== "published") {
      return null;
    }

    return {
      ...post,
      coverImageUrl: await resolveCoverImageUrl(ctx, post.coverImageStorageId),
    };
  },
});
