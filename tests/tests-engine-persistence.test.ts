import { describe, expect, it } from "vitest";
import { TestsEngine, type TestsExecutionPersistence } from "@/modules/tests/engines";
import type { TestsGraphRunContext, TestsGraphRunner } from "@/modules/tests/graphs";
import type { TestsRequest, TestsResponse } from "@shared";
import type {
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AgentExecutionTelemetrySource } from "@/modules/agent";

const testsInput: TestsRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  framework: "vitest",
  include_mocks: true,
};

const testsOutput: TestsResponse = {
  framework: "vitest",
  strategy_summary: "Cobrir caminho feliz.",
  test_cases: [
    {
      name: "retorna true para valor positivo",
      kind: "unit",
      description: "Valida regra principal.",
      assertions: ["espera true quando amount > 0"],
    },
  ],
  test_code: "import { expect, it } from 'vitest';",
  gaps: [],
};

class FakeTestsGraph implements TestsGraphRunner {
  lastContext?: TestsGraphRunContext;

  async invoke(_input: TestsRequest, context?: TestsGraphRunContext): Promise<TestsResponse> {
    this.lastContext = context;
    return testsOutput;
  }
}

class FailingTestsGraph implements TestsGraphRunner {
  async invoke(): Promise<TestsResponse> {
    throw new Error("falha no llm");
  }
}

class FakeTestsExecutionPersistence implements TestsExecutionPersistence {
  readonly pendingInputs: Array<CreatePendingExecutionInput<TestsRequest>> = [];
  readonly successInputs: Array<MarkExecutionSuccessInput<TestsResponse>> = [];
  readonly failedInputs: MarkExecutionFailedInput[] = [];
  readonly stepInputs: RecordReviewExecutionStepInput[] = [];
  readonly telemetryInputs: RecordReviewExecutionTelemetryInput[] = [];

  async createPending(input: CreatePendingExecutionInput<TestsRequest>): Promise<ReviewExecutionRecord> {
    this.pendingInputs.push(input);
    return {
      id: "execution-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "pending",
      inputPayload: input.inputPayload,
      outputPayload: null,
      durationMs: 0,
      requestHash: input.requestHash,
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
  }

  async markSuccess(input: MarkExecutionSuccessInput<TestsResponse>): Promise<ReviewExecutionRecord> {
    this.successInputs.push(input);
    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "success",
      inputPayload: testsInput,
      outputPayload: input.outputPayload,
      durationMs: input.durationMs,
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
  }

  async markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord> {
    this.failedInputs.push(input);
    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "failed",
      inputPayload: testsInput,
      outputPayload: null,
      durationMs: input.durationMs,
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: input.errorMessage,
    };
  }

  async recordStep(input: RecordReviewExecutionStepInput): Promise<void> {
    this.stepInputs.push(input);
  }

  async recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void> {
    this.telemetryInputs.push(input);
  }
}

class FakeTelemetrySource implements AgentExecutionTelemetrySource {
  snapshot() {
    return {
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      modelUsed: "openai/gpt-4o-mini",
      generationIds: ["gen-tests-1"],
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      costUsd: 0.0001,
      inputCostUsd: 0.00003,
      outputCostUsd: 0.00007,
      cacheReadTokens: 0,
    };
  }
}

describe("TestsEngine com persistencia", () => {
  it("cria execucao pendente, envia contexto ao grafo e marca sucesso", async () => {
    const graph = new FakeTestsGraph();
    const persistence = new FakeTestsExecutionPersistence();
    const telemetrySource = new FakeTelemetrySource();
    const engine = new TestsEngine(graph, persistence, telemetrySource);

    const output = await engine.execute(testsInput);

    expect(output).toEqual(testsOutput);
    expect(persistence.pendingInputs[0]?.inputPayload).toEqual(testsInput);
    expect(persistence.pendingInputs[0]?.requestHash).toEqual(expect.any(String));
    expect(graph.lastContext).toMatchObject({
      executionId: "execution-1",
      stepRecorder: persistence,
    });
    expect(persistence.successInputs[0]?.id).toBe("execution-1");
    expect(persistence.successInputs[0]?.outputPayload).toEqual(testsOutput);
    expect(persistence.failedInputs).toHaveLength(0);
    expect(persistence.telemetryInputs[0]).toMatchObject({
      executionId: "execution-1",
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      openrouterGenerationId: "gen-tests-1",
    });
  });

  it("marca execucao como falha quando o grafo quebra", async () => {
    const graph = new FailingTestsGraph();
    const persistence = new FakeTestsExecutionPersistence();
    const engine = new TestsEngine(graph, persistence);

    await expect(engine.execute(testsInput)).rejects.toThrow("falha no llm");

    expect(persistence.successInputs).toHaveLength(0);
    expect(persistence.failedInputs[0]).toMatchObject({
      id: "execution-1",
      errorMessage: "falha no llm",
    });
  });
});
