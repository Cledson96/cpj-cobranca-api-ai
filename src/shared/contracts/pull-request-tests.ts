import { z } from "zod";
import { testsFrameworkSchema } from "./tests";

const nonEmptyString = () => z.string().trim().min(1);
const githubPullRequestUrl = () => z.string().trim().url().refine(
  (value) => /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+\/?$/.test(value),
  "URL de pull request invalida.",
);

export const pullRequestTestsRequestSchema = z.object({
  github_pull_request_url: githubPullRequestUrl(),
  base_branch: nonEmptyString().default("main"),
  test_framework: testsFrameworkSchema,
  prompt_version: z.number().int().min(1).optional(),
  model: nonEmptyString().optional(),
});
export type PullRequestTestsRequest = z.infer<typeof pullRequestTestsRequestSchema>;
