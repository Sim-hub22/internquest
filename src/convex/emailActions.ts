"use node";

import { render } from "@react-email/components";
import { v } from "convex/values";

import { internalAction } from "@/convex/_generated/server";
import { ApplicationStatusEmail } from "@/convex/emails/applicationStatus";
import { NewApplicationEmail } from "@/convex/emails/newApplication";
import { NewInternshipEmail } from "@/convex/emails/newInternship";
import { NewResourceEmail } from "@/convex/emails/newResource";
import { QuizAssignedEmail } from "@/convex/emails/quizAssigned";
import { QuizGradedEmail } from "@/convex/emails/quizGraded";
import { resend } from "@/convex/resend";

const FROM = process.env.EMAIL_FROM;

if (!FROM) {
  throw new Error("EMAIL_FROM environment variable is not set");
}

export const sendApplicationStatusEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    internshipTitle: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const element = ApplicationStatusEmail({
      name: args.name,
      internshipTitle: args.internshipTitle,
      status: args.status,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `Application update: ${args.internshipTitle}`,
      html,
      text,
    });
  },
});

export const sendQuizAssignedEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    internshipTitle: v.string(),
    quizTitle: v.string(),
    quizUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const element = QuizAssignedEmail({
      name: args.name,
      internshipTitle: args.internshipTitle,
      quizTitle: args.quizTitle,
      quizUrl: args.quizUrl,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `Quiz assigned: ${args.quizTitle}`,
      html,
      text,
    });
  },
});

export const sendQuizGradedEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    quizTitle: v.string(),
    score: v.number(),
    maxScore: v.number(),
    resultsUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const element = QuizGradedEmail({
      name: args.name,
      quizTitle: args.quizTitle,
      score: args.score,
      maxScore: args.maxScore,
      resultsUrl: args.resultsUrl,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `Your quiz results are ready: ${args.quizTitle}`,
      html,
      text,
    });
  },
});

export const sendNewInternshipEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    internshipTitle: v.string(),
    company: v.string(),
    internshipUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const element = NewInternshipEmail({
      name: args.name,
      internshipTitle: args.internshipTitle,
      company: args.company,
      internshipUrl: args.internshipUrl,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `New internship matching your preferences: ${args.internshipTitle}`,
      html,
      text,
    });
  },
});

export const sendNewApplicationEmail = internalAction({
  args: {
    to: v.string(),
    recruiterName: v.string(),
    candidateName: v.string(),
    internshipTitle: v.string(),
    applicationUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const element = NewApplicationEmail({
      recruiterName: args.recruiterName,
      candidateName: args.candidateName,
      internshipTitle: args.internshipTitle,
      applicationUrl: args.applicationUrl,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `New application for ${args.internshipTitle}`,
      html,
      text,
    });
  },
});

export const sendNewResourceEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    postTitle: v.string(),
    postExcerpt: v.string(),
    postUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const element = NewResourceEmail({
      name: args.name,
      postTitle: args.postTitle,
      postExcerpt: args.postExcerpt,
      postUrl: args.postUrl,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    await resend.sendEmail(ctx, {
      from: FROM,
      to: args.to,
      subject: `New resource: ${args.postTitle}`,
      html,
      text,
    });
  },
});
