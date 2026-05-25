import { describe, expect, it } from "vitest";
import type { TestsRequest, TestsResponse } from "@shared";
import type { TestsAgentLike, TestsAnalysisContext } from "@/modules/tests/models";
import { TestsFlowGraph } from "@/modules/tests/graphs";

const testsInput: TestsRequest = {
  code: [
    "export function charge(amount: number) {",
    "  if (amount <= 0) throw new Error('invalid amount');",
    "  return true;",
    "}",
  ].join("\n"),
  language: "typescript",
  framework: "vitest",
  include_mocks: true,
};

const testsOutput: TestsResponse = {
  framework: "vitest",
  strategy_summary: "Cobrir caminho feliz e erro de valor invalido.",
  test_cases: [
    {
      name: "retorna true para valor positivo",
      kind: "unit",
      description: "Valida caminho feliz.",
      assertions: ["espera true quando amount > 0"],
    },
  ],
  test_code: "import { expect, it } from 'vitest';",
  gaps: [],
};

class FakeTestsAgent implements TestsAgentLike {
  lastContext?: TestsAnalysisContext;

  async generate(context: TestsAnalysisContext): Promise<TestsResponse> {
    this.lastContext = context;
    return testsOutput;
  }
}

describe("TestsFlowGraph", () => {
  it("executa tools, chama agente de testes e registra steps", async () => {
    const agent = new FakeTestsAgent();
    const steps: unknown[] = [];
    const graph = new TestsFlowGraph({ testsAgent: agent });

    const output = await graph.invoke(testsInput, {
      executionId: "execution-1",
      stepRecorder: {
        async recordStep(input) {
          steps.push(input);
        },
      },
    });

    expect(output).toEqual(testsOutput);
    expect(agent.lastContext?.toolResult.behaviorCandidates).toEqual([
      {
        name: "charge",
        kind: "function",
        line_hint: "linha 1",
        reason: "API publica exportada deve ter cobertura de comportamento.",
      },
    ]);
    expect(steps).toMatchObject([
      {
        executionId: "execution-1",
        nodeName: "tests_signal_extractor",
        kind: "tool",
        status: "success",
      },
      {
        executionId: "execution-1",
        nodeName: "tests_agent",
        kind: "llm",
        status: "success",
        outputPayload: testsOutput,
      },
    ]);
  });
});
