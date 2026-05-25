import { describe, expect, it } from "vitest";
import {
  pullRequestReviewRequestSchema,
  pullRequestReviewResponseSchema,
} from "@shared";

describe("pull request review schemas", () => {
  it("aceita request sem jira_issue_key", () => {
    const result = pullRequestReviewRequestSchema.parse({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
    });

    expect(result).toEqual({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
    });
  });

  it("aceita request com jira_issue_key e overrides opcionais", () => {
    const result = pullRequestReviewRequestSchema.parse({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      jira_issue_key: "CPJ-123",
      base_branch: "develop",
      prompt_version: 2,
      model: "deepseek/deepseek-v4-flash",
    });

    expect(result.jira_issue_key).toBe("CPJ-123");
    expect(result.base_branch).toBe("develop");
    expect(result.prompt_version).toBe(2);
    expect(result.model).toBe("deepseek/deepseek-v4-flash");
  });

  it("valida resposta com jira skipped", () => {
    const result = pullRequestReviewResponseSchema.parse({
      verdict: "needs_attention",
      score: 75,
      summary: "PR consistente, sem card Jira informado.",
      pull_request: {
        owner: "acme",
        repo: "app",
        number: 42,
        title: "Add charge flow",
        base_branch: "main",
        head_sha: "abc123",
        changed_files: 2,
      },
      jira: null,
      sections: {
        code_standard: { status: "passed", findings: [] },
        jira_criteria: { status: "skipped", criteria: [] },
        project_consistency: { status: "warning", findings: [] },
        security: { status: "passed", findings: [] },
      },
      positives: ["Boa separacao de responsabilidade."],
      recommendations: ["Adicionar testes de borda."],
    });

    expect(result.sections.jira_criteria.status).toBe("skipped");
    expect(result.jira).toBeNull();
  });
});
