import { describe, expect, it } from "vitest";
import {
  TestsEngine,
  type TestsExecutionPersistence,
  type TestsWebhookNotifier,
  type TestsWebhookPayload,
} from "@/modules/tests/engines";
import type { TestsGraphRunContext, TestsGraphRunner } from "@/modules/tests/graphs";
import type { TestsRequest, TestsResponse } from "@shared";
import type {
  CreateCacheHitExecutionInput,
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
  test_framework: "vitest",
};

const testsOutput: TestsResponse = {
  framework: "vitest",
  test_file: [
    "import { expect, it } from 'vitest';",
    "import { charge } from './charge';",
    "",
    "it('retorna true para valor positivo', () => {",
    "  expect(charge(100)).toBe(true);",
    "});",
  ].join("\n"),
  test_cases: [
    {
      name: "retorna true para valor positivo",
      type: "happy_path",
      description: "Valida regra principal.",
    },
  ],
  coverage_hints: ["Cobrir valores invalidos."],
};

class FakeTestsGraph implements TestsGraphRunner {
  lastContext?: TestsGraphRunContext;
  calls = 0;

  async invoke(_input: TestsRequest, context?: TestsGraphRunContext): Promise<TestsResponse> {
    this.calls += 1;
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
  readonly cacheHitInputs: Array<CreateCacheHitExecutionInput<TestsRequest, TestsResponse>> = [];
  readonly successInputs: Array<MarkExecutionSuccessInput<TestsResponse>> = [];
  readonly failedInputs: MarkExecutionFailedInput[] = [];
  readonly stepInputs: RecordReviewExecutionStepInput[] = [];
  readonly telemetryInputs: RecordReviewExecutionTelemetryInput[] = [];
  cachedRecord: ReviewExecutionRecord | null = null;

  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    void requestHash;
    return this.cachedRecord;
  }

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

  async createCacheHit(
    input: CreateCacheHitExecutionInput<TestsRequest, TestsResponse>,
  ): Promise<ReviewExecutionRecord> {
    this.cacheHitInputs.push(input);
    return {
      id: "execution-cache-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "success",
      inputPayload: input.inputPayload,
      outputPayload: input.outputPayload,
      durationMs: input.durationMs,
      requestHash: input.requestHash,
      cacheHit: true,
      sourceExecutionId: input.sourceExecutionId,
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

class FakeTestsWebhookNotifier implements TestsWebhookNotifier {
  readonly payloads: TestsWebhookPayload[] = [];

  constructor(private readonly failWith?: Error) {}

  async notify(payload: TestsWebhookPayload): Promise<void> {
    this.payloads.push(payload);
    if (this.failWith) {
      throw this.failWith;
    }
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

  it("envia webhook de sucesso e registra step quando callback esta configurado", async () => {
    const graph = new FakeTestsGraph();
    const persistence = new FakeTestsExecutionPersistence();
    const webhookNotifier = new FakeTestsWebhookNotifier();
    const engine = new TestsEngine(graph, persistence, undefined, webhookNotifier);

    await engine.execute(testsInput);

    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "tests",
        execution_id: "execution-1",
        status: "success",
        cache_hit: false,
        output: testsOutput,
      },
    ]);
    expect(persistence.stepInputs.find((step) => step.nodeName === "webhook_callback")).toMatchObject({
      executionId: "execution-1",
      kind: "webhook",
      status: "success",
      inputPayload: { status: "success", cacheHit: false },
      outputPayload: { delivered: true },
    });
  });

  it("usa cache hit isolado de tests e envia webhook com cache_hit true", async () => {
    const graph = new FakeTestsGraph();
    const persistence = new FakeTestsExecutionPersistence();
    const webhookNotifier = new FakeTestsWebhookNotifier();
    persistence.cachedRecord = {
      id: "execution-original",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "success",
      inputPayload: testsInput,
      outputPayload: testsOutput,
      durationMs: 900,
      requestHash: "hash-original",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const engine = new TestsEngine(graph, persistence, undefined, webhookNotifier);

    const output = await engine.execute(testsInput);

    expect(output).toEqual(testsOutput);
    expect(graph.calls).toBe(0);
    expect(persistence.cacheHitInputs[0]).toMatchObject({
      sourceExecutionId: "execution-original",
      outputPayload: testsOutput,
    });
    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "tests",
        execution_id: "execution-cache-1",
        status: "success",
        cache_hit: true,
        output: testsOutput,
      },
    ]);
  });

  it("ignora cache antigo quando output nao bate com o schema atual", async () => {
    const graph = new FakeTestsGraph();
    const persistence = new FakeTestsExecutionPersistence();
    persistence.cachedRecord = {
      id: "execution-old",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "tests",
      status: "success",
      inputPayload: testsInput,
      outputPayload: {
        framework: "jest",
        test_file: "parcelas.service.test.ts",
        test_cases: [],
        coverage_hints: [],
      },
      durationMs: 900,
      requestHash: "hash-old",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const engine = new TestsEngine(graph, persistence);

    const output = await engine.execute(testsInput);

    expect(output).toEqual(testsOutput);
    expect(graph.calls).toBe(1);
    expect(persistence.cacheHitInputs).toHaveLength(0);
    expect(persistence.pendingInputs).toHaveLength(1);
    expect(persistence.successInputs[0]?.outputPayload).toEqual(testsOutput);
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
