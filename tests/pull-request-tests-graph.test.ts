import { describe, expect, it, vi } from "vitest";
import { PullRequestTestsFlowGraph } from "@/modules/tests/pull-request";
import type { StructuredOutputRunner, StructuredOutputRunnerInput } from "@/modules/agent";
import { TestsPromptCatalog } from "@/modules/tests/prompts";
import type { TestsResponse } from "@shared";

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
  diff: [
    "diff --git a/src/charge.ts b/src/charge.ts",
    "@@",
    "+export function charge(amount: number) {",
    "+  if (amount <= 0) throw new Error('invalid amount');",
    "+  return true;",
    "+}",
  ].join("\n"),
  files: [
    {
      filename: "src/charge.ts",
      status: "modified",
      patch: [
        "@@",
        "+export function charge(amount: number) {",
        "+  if (amount <= 0) throw new Error('invalid amount');",
        "+  return true;",
        "+}",
      ].join("\n"),
      raw_url: "https://raw.githubusercontent.com/acme/app/abc123/src/charge.ts",
    },
  ],
  contextFiles: [
    {
      path: "src/charge.ts",
      content: "export function charge(amount: number) { return amount > 0; }",
    },
  ],
};

const testsResponse: TestsResponse = {
  framework: "vitest",
  test_file: [
    "import { describe, expect, it } from 'vitest';",
    "import { charge } from './charge';",
    "",
    "describe('charge', () => {",
    "  it('covers critical changed behavior', () => {",
    "    expect(charge(100)).toBe(true);",
    "  });",
    "});",
  ].join("\n"),
  test_cases: [],
  coverage_hints: [],
};

class FakeRunner implements StructuredOutputRunner {
  readonly calls: Array<{ schemaName: string; userPayload: string }> = [];

  async run<TOutput extends Record<string, unknown>>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    this.calls.push({
      schemaName: input.schemaName,
      userPayload: input.messages.at(-1)?.content ?? "",
    });

    return testsResponse as unknown as TOutput;
  }
}

describe("PullRequestTestsFlowGraph", () => {
  it("busca PR, identifica funcoes criticas e gera teste unitario", async () => {
    const githubClient = {
      fetchPullRequest: vi.fn().mockResolvedValue(source),
    };
    const runner = new FakeRunner();
    const graph = new PullRequestTestsFlowGraph({
      githubClient,
      runner,
    });

    const result = await graph.invoke({
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
      test_framework: "vitest",
    }, {
      promptCatalog: TestsPromptCatalog.default(),
      resolvedModel: "openai/gpt-4o-mini",
    });

    expect(result).toEqual(testsResponse);
    expect(githubClient.fetchPullRequest).toHaveBeenCalledOnce();
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]?.schemaName).toBe("PullRequestTestsAgentOutput");
    expect(runner.calls[0]?.userPayload).toContain("charge");
    expect(runner.calls[0]?.userPayload).toContain("critical_functions");
    expect(runner.calls[0]?.userPayload).toContain("typescript");
  });
});
