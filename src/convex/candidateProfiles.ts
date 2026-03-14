import { ConvexError, v } from "convex/values";

import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "@/convex/_generated/server";
import { requireAnyRole, requireRole } from "@/convex/lib/auth";

const categoryValidator = v.union(
  v.literal("technology"),
  v.literal("business"),
  v.literal("design"),
  v.literal("marketing"),
  v.literal("finance"),
  v.literal("healthcare"),
  v.literal("other")
);

const locationTypeValidator = v.union(
  v.literal("remote"),
  v.literal("onsite"),
  v.literal("hybrid")
);

const proficiencyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced")
);

const educationEntryValidator = v.object({
  institution: v.string(),
  degree: v.string(),
  graduationYear: v.number(),
  gpa: v.optional(v.number()),
});

const skillEntryValidator = v.object({
  name: v.string(),
  proficiency: proficiencyValidator,
});

const experienceEntryValidator = v.object({
  title: v.string(),
  company: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  description: v.optional(v.string()),
});

function trimOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEducation(
  education: {
    institution: string;
    degree: string;
    graduationYear: number;
    gpa?: number;
  }[]
) {
  return education.map((entry) => ({
    institution: entry.institution.trim(),
    degree: entry.degree.trim(),
    graduationYear: entry.graduationYear,
    ...(entry.gpa === undefined ? {} : { gpa: entry.gpa }),
  }));
}

function normalizeSkills(
  skills: {
    name: string;
    proficiency: "beginner" | "intermediate" | "advanced";
  }[]
) {
  return skills.map((entry) => ({
    name: entry.name.trim(),
    proficiency: entry.proficiency,
  }));
}

function normalizeExperience(
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }[]
) {
  return experience.map((entry) => ({
    title: entry.title.trim(),
    company: entry.company.trim(),
    startDate: entry.startDate.trim(),
    ...(trimOptionalString(entry.endDate)
      ? { endDate: trimOptionalString(entry.endDate) }
      : {}),
    ...(trimOptionalString(entry.description)
      ? { description: trimOptionalString(entry.description) }
      : {}),
  }));
}

function normalizeLinks(links: {
  github?: string;
  linkedin?: string;
  portfolio?: string;
}) {
  return {
    ...(trimOptionalString(links.github)
      ? { github: trimOptionalString(links.github) }
      : {}),
    ...(trimOptionalString(links.linkedin)
      ? { linkedin: trimOptionalString(links.linkedin) }
      : {}),
    ...(trimOptionalString(links.portfolio)
      ? { portfolio: trimOptionalString(links.portfolio) }
      : {}),
  };
}

async function profileByUserId(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  return await ctx.db
    .query("candidateProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export const current = query({
  args: {},
  handler: async (ctx): Promise<Doc<"candidateProfiles"> | null> => {
    const candidate = await requireRole(ctx, "candidate");
    return await profileByUserId(ctx, candidate._id);
  },
});

export const getByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"candidateProfiles"> | null> => {
    const requester = await requireAnyRole(ctx, [
      "candidate",
      "recruiter",
      "admin",
    ]);

    if (requester.role === "candidate" && requester._id !== args.userId) {
      throw new ConvexError("FORBIDDEN");
    }

    return await profileByUserId(ctx, args.userId);
  },
});

export const upsert = mutation({
  args: {
    headline: v.optional(v.string()),
    education: v.array(educationEntryValidator),
    skills: v.array(skillEntryValidator),
    experience: v.array(experienceEntryValidator),
    links: v.object({
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      portfolio: v.optional(v.string()),
    }),
    preferredCategories: v.optional(v.array(categoryValidator)),
    preferredLocationType: v.optional(locationTypeValidator),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidate = await requireRole(ctx, "candidate");
    const existingProfile = await profileByUserId(ctx, candidate._id);
    const now = Date.now();

    const profilePatch = {
      education: normalizeEducation(args.education),
      skills: normalizeSkills(args.skills),
      experience: normalizeExperience(args.experience),
      links: normalizeLinks(args.links),
      updatedAt: now,
      ...(trimOptionalString(args.headline)
        ? { headline: trimOptionalString(args.headline) }
        : {}),
      ...(trimOptionalString(args.location)
        ? { location: trimOptionalString(args.location) }
        : {}),
      ...(args.preferredCategories && args.preferredCategories.length > 0
        ? { preferredCategories: args.preferredCategories }
        : {}),
      ...(args.preferredLocationType
        ? { preferredLocationType: args.preferredLocationType }
        : {}),
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profilePatch);
      return existingProfile._id;
    }

    return await ctx.db.insert("candidateProfiles", {
      userId: candidate._id,
      ...profilePatch,
    });
  },
});
