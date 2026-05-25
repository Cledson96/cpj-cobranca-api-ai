import { describe, expect, it, vi } from "vitest";
import { PullRequestReviewFlowGraph } from "@/modules/review/pull-request";
import type { StructuredOutputRunner, StructuredOutputRunnerInput } from "@/modules/agent";
import type { PullRequestReviewRuntimePromptSet } from "@/modules/prompts";

const promptSet: PullRequestReviewRuntimePromptSet = {
  code_standard: "code standard prompt",
  jira_criteria: "jira prompt",
  project_consistency: "project consistency prompt",
  security: "security prompt",
  aggregator: "aggregator prompt",
};

const source = {
  pullRequest: {
    owner: "acme",
    repo: "app",
    number: 42,
    title: "Add charge flow",
    baseBranch: "main",
    headSha: "abc123",
    changedFiles: 1,
  },
  diff: "diff --git a/src/charge.ts b/src/charge.ts",
  files: [
    {
      filename: "src/charge.ts",
      status: "modified",
      patch: "@@ export function charge() {}",
      raw_url: "https://raw.githubusercontent.com/acme/app/abc123/src/charge.ts",
    },
  ],
  contextFiles: [
    {
      path: "src/existing-charge.ts",
      content: "export class ExistingCharge {}",
    },
  ],
};

class FakeRunner implements StructuredOutputRunner {
  readonly calls: string[] = [];

  async run<TOutput extends Record<string, unknown>>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    this.calls.push(input.schemaName);

    if (input.schemaName === "PullRequestReviewAggregatorOutput") {
      return {
        verdict: "needs_attention",
        score: 80,
        summary: "Review sem Jira.",
        positives: [],
        recommendations: [],
      } as unknown as TOutput;
    }

    if (input.schemaName === "PullRequestJiraCriteriaOutput") {
      return {
        status: "passed",
        criteria: [
          {
            description: "deve cobrar contratos ativos",
            status: "passed",
            evidence: "Diff mostra validacao.",
          },
        ],
      } as unknown as TOutput;
    }

    return { status: "passed", findings: [] } as unknown as TOutput;
  }
}

function createGraph() {
  const githubClient = {
    fetchPullRequest: vi.fn().mockResolvedValue(source),
  };
  const jiraClient = {
    fetchIssue: vi.fn().mockResolvedValue({
      issue_key: "CPJ-123",
      summary: "Adicionar cobranca",
      description: "Critérios de aceite: deve cobrar contratos ativos.",
      acceptance_criteria: ["deve cobrar contratos ativos"],
    }),
  };
  const standardsLoader = {
    loadForFiles: vi.fn().mockResolvedValue([
      { technology: "node-typescript", content: "Padrao Node.js com TypeScript" },
    ]),
  };
  const runner = new FakeRunner();

  return {
    graph: new PullRequestReviewFlowGraph({
      githubClient,
      jiraClient,
      standardsLoader,
      runner,
    }),
    githubClient,
    jiraClient,
    standardsLoader,
    runner,
  };
}

describe("PullRequestReviewFlowGraph", () => {
  it("executa o fluxo sem Jira e pula o agente de criterios", async () => {
    const { graph, githubClient, jiraClient, standardsLoader, runner } = createGraph();

    const result = await graph.invoke({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
    }, {
      promptSet,
      resolvedModel: "openai/gpt-4o-mini",
    });

    expect(result.jira).toBeNull();
    expect(result.sections.jira_criteria.status).toBe("skipped");
    expect(githubClient.fetchPullRequest).toHaveBeenCalledOnce();
    expect(jiraClient.fetchIssue).not.toHaveBeenCalled();
    expect(standardsLoader.loadForFiles).toHaveBeenCalledWith(["src/charge.ts"]);
    expect(runner.calls).toEqual([
      "PullRequestCodeStandardOutput",
      "PullRequestProjectConsistencyOutput",
      "PullRequestSecurityOutput",
      "PullRequestReviewAggregatorOutput",
    ]);
  });

  it("executa o agente de criterios quando Jira e informado", async () => {
    const { graph, jiraClient, runner } = createGraph();

    await graph.invoke({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      jira_issue_key: "CPJ-123",
      base_branch: "main",
    }, {
      promptSet,
      resolvedModel: "openai/gpt-4o-mini",
    });

    expect(jiraClient.fetchIssue).toHaveBeenCalledWith("CPJ-123");
    expect(runner.calls).toContain("PullRequestJiraCriteriaOutput");
    expect(runner.calls.at(-1)).toBe("PullRequestReviewAggregatorOutput");
  });
});
