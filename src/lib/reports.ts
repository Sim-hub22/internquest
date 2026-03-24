export const REPORT_REASONS = [
  "spam",
  "misleading_information",
  "inappropriate_content",
  "fraud_or_scam",
  "harassment",
  "other",
] as const;

export const REPORT_TARGET_TYPES = ["internship", "user", "blog_post"] as const;

export const REPORT_STATUSES = [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
] as const;

export const REPORT_ACTION_TYPES = [
  "close_internship",
  "unpublish_blog_post",
  "suspend_user",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportActionType = (typeof REPORT_ACTION_TYPES)[number];

export function toReportLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
