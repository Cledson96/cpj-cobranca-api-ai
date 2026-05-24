import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = z.string().trim().min(1);

export const reviewRequestSchema = z.object({
  code: nonEmptyString,
  language: supportedLanguageSchema,
  context: z.string().trim().optional(),
});
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export const reviewIssueSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  line_hint: z.string().nullable(),
  description: nonEmptyString,
  suggestion: nonEmptyString,
});
export type ReviewIssue = z.infer<typeof reviewIssueSchema>;

export const reviewResponseSchema = z.object({
  overall_quality: z.enum(["good", "needs_improvement", "critical"]),
  score: z.number().int().min(0).max(10),
  issues: z.array(reviewIssueSchema),
  positives: z.array(nonEmptyString),
  summary: nonEmptyString,
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
