import { describe, expect, it, vi } from "vitest";
import { DefaultPullRequestReviewService } from "@/modules/review/pull-request";
import type { PullRequestReviewResponse } from "@shared";

const responseWithoutJira: PullRequestReviewResponse = {
  verdict: "needs_attention",
  score: 80,
  summary: "Review sem Jira.",
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
    project_consistency: { status: "warning", findings: [] },
    security: { status: "passed", findings: [] },
  },
  positives: [],
  recommendations: [],
};

function createService(overrides: Record<string, unknown> = {}) {
  const graph = {
    invoke: vi.fn().mockResolvedValue(responseWithoutJira),
  };
  const modelResolver = {
    resolveRequestedModel: vi.fn().mockResolvedValue("openai/gpt-4o-mini"),
  };
  const promptResolver = {
    resolvePullRequestReview: vi.fn().mockResolvedValue({
      code_standard: "code standard prompt",
      jira_criteria: "jira prompt",
      project_consistency: "project consistency prompt",
      security: "security prompt",
      aggregator: "aggregator prompt",
    }),
    resolveReview: vi.fn(),
    resolveCompliance: vi.fn(),
    resolveDocument: vi.fn(),
    resolveTests: vi.fn(),
  };

  return {
    service: new DefaultPullRequestReviewService({
      graph,
      modelResolver,
      promptResolver,
      ...overrides,
    }),
    graph,
    modelResolver,
    promptResolver,
  };
}

describe("DefaultPullRequestReviewService", () => {
  it("executa o graph com modelo e prompt resolvidos", async () => {
    const { service, graph, promptResolver } = createService();

    const result = await service.execute({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
      prompt_version: 2,
    });

    expect(result.jira).toBeNull();
    expect(result.sections.jira_criteria.status).toBe("skipped");
    expect(promptResolver.resolvePullRequestReview).toHaveBeenCalledWith(2);
    expect(graph.invoke).toHaveBeenCalledWith(expect.objectContaining({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
    }), expect.objectContaining({
      resolvedModel: "openai/gpt-4o-mini",
      promptSet: expect.objectContaining({
        aggregator: "aggregator prompt",
      }),
    }));
  });

  it("repassa jira_issue_key para o graph", async () => {
    const responseWithJira: PullRequestReviewResponse = {
      ...responseWithoutJira,
      jira: {
        issue_key: "CPJ-123",
        summary: "Adicionar cobranca",
        criteria_count: 1,
        evaluated: true,
      },
      sections: {
        ...responseWithoutJira.sections,
        jira_criteria: {
          status: "passed",
          criteria: [
            {
              description: "deve cobrar contratos ativos",
              status: "passed",
              evidence: "Fluxo valida contrato ativo.",
            },
          ],
        },
      },
    };
    const graph = {
      invoke: vi.fn().mockResolvedValue(responseWithJira),
    };
    const { service } = createService({ graph });

    const result = await service.execute({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      jira_issue_key: "CPJ-123",
      base_branch: "main",
      model: "openai/gpt-4o-mini",
    });

    expect(result.jira?.issue_key).toBe("CPJ-123");
    expect(graph.invoke).toHaveBeenCalledWith(expect.objectContaining({
      jira_issue_key: "CPJ-123",
    }), expect.objectContaining({
      resolvedModel: "openai/gpt-4o-mini",
    }));
  });
});
