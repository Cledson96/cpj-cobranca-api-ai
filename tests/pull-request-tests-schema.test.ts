import { describe, expect, it } from "vitest";
import { pullRequestTestsRequestSchema } from "@shared";

describe("pullRequestTestsRequestSchema", () => {
  it("aceita URL de PR e aplica main como branch base padrao", () => {
    const parsed = pullRequestTestsRequestSchema.parse({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      test_framework: "vitest",
      prompt_version: 2,
      model: "openai/gpt-4o-mini",
    });

    expect(parsed).toEqual({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
      test_framework: "vitest",
      prompt_version: 2,
      model: "openai/gpt-4o-mini",
    });
  });

  it("rejeita URL que nao seja pull request do GitHub", () => {
    const parsed = pullRequestTestsRequestSchema.safeParse({
      github_pull_request_url: "https://github.com/acme/app/issues/42",
      test_framework: "vitest",
    });

    expect(parsed.success).toBe(false);
  });
});
