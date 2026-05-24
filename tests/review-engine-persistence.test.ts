import { describe, expect, it } from "vitest";
import { ReviewEngine, type ReviewExecutionPersistence } from "@/modules/review/engines";
import type { ReviewGraphRunContext, ReviewGraphRunner } from "@/modules/review/graphs";
import type { ReviewRequest, ReviewResponse } from "@shared";
import type {
  CreatePendingReviewExecutionInput,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  RecordReviewExecutionStepInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AgentExecutionTelemetrySource } from "@/modules/agent";

const reviewInput: ReviewRequest = {
  code: "export async function main() { return 1; }",
  language: "typescript",
  context: "Servico simples",
};

const reviewOutput: ReviewResponse = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Codigo pequeno."],
  summary: "Sem problemas relevantes.",
};

class FakeReviewGraph implements ReviewGraphRunner {
  lastContext?: ReviewGraphRunContext;

  constructor(private readonly output: ReviewResponse = reviewOutput) {}

  async invoke(_input: ReviewRequest, context?: ReviewGraphRunContext): Promise<ReviewResponse> {
    this.lastContext = context;

    return this.output;
  }
}

class FailingReviewGraph implements ReviewGraphRunner {
  lastContext?: ReviewGraphRunContext;

  async invoke(_input: ReviewRequest, context?: ReviewGraphRunContext): Promise<ReviewResponse> {
    this.lastContext = context;
    throw new Error("falha no llm");
  }
}

class FakeReviewExecutionPersistence implements ReviewExecutionPersistence {
  readonly pendingInputs: CreatePendingReviewExecutionInput[] = [];
  readonly successInputs: MarkReviewExecutionSuccessInput[] = [];
  readonly failedInputs: MarkReviewExecutionFailedInput[] = [];
  readonly stepInputs: RecordReviewExecutionStepInput[] = [];
  readonly telemetryInputs: RecordReviewExecutionTelemetryInput[] = [];

  async createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord> {
    this.pendingInputs.push(input);

    return {
      id: "execution-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "review",
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

  async markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord> {
    this.successInputs.push(input);

    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "review",
      status: "success",
      inputPayload: reviewInput,
      outputPayload: input.outputPayload,
      durationMs: input.durationMs,
      requestHash: this.pendingInputs[0]?.requestHash ?? "hash",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
  }

  async markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord> {
    this.failedInputs.push(input);

    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "review",
      status: "failed",
      inputPayload: reviewInput,
      outputPayload: null,
      durationMs: input.durationMs,
      requestHash: this.pendingInputs[0]?.requestHash ?? "hash",
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
      generationIds: ["gen-1"],
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      costUsd: 0.0001,
      inputCostUsd: 0.00003,
      outputCostUsd: 0.00007,
      cacheReadTokens: 4,
    };
  }
}

describe("ReviewEngine com persistencia", () => {
  it("cria execucao pendente, envia contexto ao grafo e marca sucesso", async () => {
    const graph = new FakeReviewGraph();
    const persistence = new FakeReviewExecutionPersistence();
    const telemetrySource = new FakeTelemetrySource();
    const engine = new ReviewEngine(graph, persistence, telemetrySource);

    const output = await engine.execute(reviewInput);

    expect(output).toEqual(reviewOutput);
    expect(persistence.pendingInputs).toHaveLength(1);
    expect(persistence.pendingInputs[0]?.inputPayload).toEqual(reviewInput);
    expect(persistence.pendingInputs[0]?.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(graph.lastContext?.executionId).toBe("execution-1");
    expect(graph.lastContext?.stepRecorder).toBe(persistence);
    expect(persistence.successInputs).toHaveLength(1);
    expect(persistence.successInputs[0]?.id).toBe("execution-1");
    expect(persistence.successInputs[0]?.outputPayload).toEqual(reviewOutput);
    expect(persistence.successInputs[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(persistence.telemetryInputs).toEqual([
      {
        executionId: "execution-1",
        provider: "openrouter",
        modelRequested: "openai/gpt-4o-mini",
        modelUsed: "openai/gpt-4o-mini",
        langsmithRunId: "gen-1",
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
        costUsd: "0.0001",
        inputCostUsd: "0.00003",
        outputCostUsd: "0.00007",
        cacheReadTokens: 4,
      },
    ]);
    expect(persistence.failedInputs).toHaveLength(0);
  });

  it("marca execucao como falha quando o grafo quebra", async () => {
    const graph = new FailingReviewGraph();
    const persistence = new FakeReviewExecutionPersistence();
    const engine = new ReviewEngine(graph, persistence);

    await expect(engine.execute(reviewInput)).rejects.toThrow("falha no llm");

    expect(graph.lastContext?.executionId).toBe("execution-1");
    expect(persistence.successInputs).toHaveLength(0);
    expect(persistence.failedInputs).toHaveLength(1);
    expect(persistence.failedInputs[0]?.id).toBe("execution-1");
    expect(persistence.failedInputs[0]?.errorMessage).toBe("falha no llm");
    expect(persistence.failedInputs[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
