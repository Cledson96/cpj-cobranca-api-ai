import { z } from "zod";

const nonEmptyString = () => z.string().trim().min(1);
const githubPullRequestUrl = () => z.string().trim().url().refine(
  (value) => /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(value),
  "URL de pull request invalida.",
);

export const pullRequestReviewRequestSchema = z.object({
  github_pull_request_url: githubPullRequestUrl(),
  jira_issue_key: z.string().trim().min(1).optional(),
  base_branch: nonEmptyString().default("main"),
  prompt_version: z.number().int().min(1).optional(),
  model: nonEmptyString().optional(),
});
export type PullRequestReviewRequest = z.infer<typeof pullRequestReviewRequestSchema>;

export const pullRequestReviewVerdictSchema = z.enum([
  "approved",
  "changes_requested",
  "needs_attention",
]);
export type PullRequestReviewVerdict = z.infer<typeof pullRequestReviewVerdictSchema>;

export const pullRequestReviewSectionStatusSchema = z.enum([
  "passed",
  "warning",
  "failed",
]);
export type PullRequestReviewSectionStatus = z.infer<typeof pullRequestReviewSectionStatusSchema>;

export const pullRequestReviewJiraStatusSchema = z.enum([
  "passed",
  "warning",
  "failed",
  "skipped",
]);
export type PullRequestReviewJiraStatus = z.infer<typeof pullRequestReviewJiraStatusSchema>;

export const pullRequestReviewFindingSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  file_path: z.string().trim().min(1).nullable(),
  line_hint: z.string().trim().min(1).nullable(),
  description: nonEmptyString(),
  suggestion: nonEmptyString(),
});
export type PullRequestReviewFinding = z.infer<typeof pullRequestReviewFindingSchema>;

export const pullRequestReviewCriterionSchema = z.object({
  description: nonEmptyString(),
  status: pullRequestReviewJiraStatusSchema.exclude(["skipped"]),
  evidence: nonEmptyString(),
});
export type PullRequestReviewCriterion = z.infer<typeof pullRequestReviewCriterionSchema>;

export const pullRequestReviewResponseSchema = z.object({
  verdict: pullRequestReviewVerdictSchema,
  score: z.number().int().min(0).max(100),
  summary: nonEmptyString(),
  pull_request: z.object({
    owner: nonEmptyString(),
    repo: nonEmptyString(),
    number: z.number().int().min(1),
    title: nonEmptyString(),
    base_branch: nonEmptyString(),
    head_sha: nonEmptyString(),
    changed_files: z.number().int().min(0),
  }),
  jira: z.object({
    issue_key: nonEmptyString(),
    summary: nonEmptyString(),
    criteria_count: z.number().int().min(0),
    evaluated: z.boolean(),
  }).nullable(),
  sections: z.object({
    code_standard: z.object({
      status: pullRequestReviewSectionStatusSchema,
      findings: z.array(pullRequestReviewFindingSchema),
    }),
    jira_criteria: z.object({
      status: pullRequestReviewJiraStatusSchema,
      criteria: z.array(pullRequestReviewCriterionSchema),
    }),
    project_consistency: z.object({
      status: pullRequestReviewSectionStatusSchema,
      findings: z.array(pullRequestReviewFindingSchema),
    }),
    security: z.object({
      status: pullRequestReviewSectionStatusSchema,
      findings: z.array(pullRequestReviewFindingSchema),
    }),
  }),
  positives: z.array(nonEmptyString()),
  recommendations: z.array(nonEmptyString()),
});
export type PullRequestReviewResponse = z.infer<typeof pullRequestReviewResponseSchema>;
