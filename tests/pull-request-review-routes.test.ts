import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { PullRequestReviewResponse } from "@shared";
import type { PullRequestReviewService } from "@/modules/review/pull-request";
import { createTestEnv } from "./support/test-env";

const responseBody: PullRequestReviewResponse = {
  verdict: "approved",
  score: 92,
  summary: "PR aderente.",
  pull_request: {
    owner: "acme",
    repo: "app",
    number: 42,
    title: "Add charge flow",
    base_branch: "main",
    head_sha: "abc123",
    changed_files: 1,
  },
  jira: null,
  sections: {
    code_standard: { status: "passed", findings: [] },
    jira_criteria: { status: "skipped", criteria: [] },
    project_consistency: { status: "passed", findings: [] },
    security: { status: "passed", findings: [] },
  },
  positives: ["Segue padroes TR."],
  recommendations: [],
};

function createApp(pullRequestReviewService: PullRequestReviewService) {
  return buildApp({
    env: createTestEnv(),
    registerDatabase: false,
    serverOptions: { logger: false },
    dependencies: {
      reviewService: {
        execute: vi.fn(),
        executeStream: vi.fn(),
      },
      pullRequestReviewService,
    },
  });
}

describe("POST /api/v1/review/pull-request", () => {
  it("executa review de pull request com payload valido sem Jira", async () => {
    const pullRequestReviewService = {
      execute: vi.fn().mockResolvedValue(responseBody),
    };
    const app = createApp(pullRequestReviewService);
    const payload = {
      github_pull_request_url: "https://github.com/acme/app/pull/42",
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/pull-request",
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(responseBody);
    expect(pullRequestReviewService.execute).toHaveBeenCalledWith({
      ...payload,
      base_branch: "main",
    });

    await app.close();
  });

  it("retorna 400 para URL invalida", async () => {
    const pullRequestReviewService = {
      execute: vi.fn(),
    };
    const app = createApp(pullRequestReviewService);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review/pull-request",
      payload: {
        github_pull_request_url: "https://github.com/acme/app/issues/42",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(pullRequestReviewService.execute).not.toHaveBeenCalled();

    await app.close();
  });
});
