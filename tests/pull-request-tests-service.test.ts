import { describe, expect, it, vi } from "vitest";
import { DefaultPullRequestTestsService } from "@/modules/tests/pull-request";
import type { TestsResponse } from "@shared";

const testsOutput: TestsResponse = {
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

function createService() {
  const graph = {
    invoke: vi.fn().mockResolvedValue(testsOutput),
  };
  const modelResolver = {
    resolveRequestedModel: vi.fn().mockResolvedValue("openai/gpt-4o-mini"),
  };
  const promptResolver = {
    resolveTests: vi.fn().mockResolvedValue({ agent: "tests prompt" }),
    resolveReview: vi.fn(),
    resolveCompliance: vi.fn(),
    resolveDocument: vi.fn(),
    resolvePullRequestReview: vi.fn(),
  };
  const service = new DefaultPullRequestTestsService({
    graph,
    modelResolver,
    promptResolver,
  });

  return { service, graph, modelResolver, promptResolver };
}

describe("DefaultPullRequestTestsService", () => {
  it("resolve modelo e prompt antes de executar o graph", async () => {
    const { service, graph, modelResolver, promptResolver } = createService();
    const input = {
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      base_branch: "main",
      test_framework: "vitest",
      prompt_version: 3,
      model: "openai/gpt-4o-mini",
    };

    const output = await service.execute(input);

    expect(output).toEqual(testsOutput);
    expect(modelResolver.resolveRequestedModel).toHaveBeenCalledWith("openai/gpt-4o-mini");
    expect(promptResolver.resolveTests).toHaveBeenCalledWith(3);
    expect(graph.invoke).toHaveBeenCalledWith(input, expect.objectContaining({
      resolvedModel: "openai/gpt-4o-mini",
      promptCatalog: expect.any(Object),
    }));
  });
});
