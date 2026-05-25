import { describe, expect, it } from "vitest";
import {
  DocumentEngine,
  type DocumentExecutionPersistence,
  type DocumentWebhookNotifier,
  type DocumentWebhookPayload,
} from "@/modules/document/engines";
import type { DocumentGraphRunContext, DocumentGraphRunner } from "@/modules/document/graphs";
import type { DocumentRequest, DocumentResponse } from "@shared";
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

const documentInput: DocumentRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  title: "Cobranca",
  audience: "developer",
  detail_level: "standard",
};

const documentOutput: DocumentResponse = {
  title: "Cobranca",
  summary: "Documenta a regra principal de cobranca.",
  documentation: "## Cobranca\n\nUse `charge` para validar cobrancas.",
  public_api: [
    {
      name: "charge",
      kind: "function",
      description: "Valida se uma cobranca tem valor positivo.",
    },
  ],
  examples: ["charge(100)"],
  gaps: [],
};

class FakeDocumentGraph implements DocumentGraphRunner {
  lastContext?: DocumentGraphRunContext;
  calls = 0;

  async invoke(_input: DocumentRequest, context?: DocumentGraphRunContext): Promise<DocumentResponse> {
    this.calls += 1;
    this.lastContext = context;
    return documentOutput;
  }
}

class FailingDocumentGraph implements DocumentGraphRunner {
  async invoke(): Promise<DocumentResponse> {
    throw new Error("falha no llm");
  }
}

class FakeDocumentExecutionPersistence implements DocumentExecutionPersistence {
  readonly pendingInputs: Array<CreatePendingExecutionInput<DocumentRequest>> = [];
  readonly cacheHitInputs: Array<CreateCacheHitExecutionInput<DocumentRequest, DocumentResponse>> = [];
  readonly successInputs: Array<MarkExecutionSuccessInput<DocumentResponse>> = [];
  readonly failedInputs: MarkExecutionFailedInput[] = [];
  readonly stepInputs: RecordReviewExecutionStepInput[] = [];
  readonly telemetryInputs: RecordReviewExecutionTelemetryInput[] = [];
  cachedRecord: ReviewExecutionRecord | null = null;

  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    void requestHash;
    return this.cachedRecord;
  }

  async createPending(input: CreatePendingExecutionInput<DocumentRequest>): Promise<ReviewExecutionRecord> {
    this.pendingInputs.push(input);
    return {
      id: "execution-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "document",
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
    input: CreateCacheHitExecutionInput<DocumentRequest, DocumentResponse>,
  ): Promise<ReviewExecutionRecord> {
    this.cacheHitInputs.push(input);
    return {
      id: "execution-cache-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "document",
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

  async markSuccess(input: MarkExecutionSuccessInput<DocumentResponse>): Promise<ReviewExecutionRecord> {
    this.successInputs.push(input);
    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "document",
      status: "success",
      inputPayload: documentInput,
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
      flowType: "document",
      status: "failed",
      inputPayload: documentInput,
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
      generationIds: ["gen-doc-1"],
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

class FakeDocumentWebhookNotifier implements DocumentWebhookNotifier {
  readonly payloads: DocumentWebhookPayload[] = [];

  constructor(private readonly failWith?: Error) {}

  async notify(payload: DocumentWebhookPayload): Promise<void> {
    this.payloads.push(payload);
    if (this.failWith) {
      throw this.failWith;
    }
  }
}

describe("DocumentEngine com persistencia", () => {
  it("cria execucao pendente, envia contexto ao grafo e marca sucesso", async () => {
    const graph = new FakeDocumentGraph();
    const persistence = new FakeDocumentExecutionPersistence();
    const telemetrySource = new FakeTelemetrySource();
    const engine = new DocumentEngine(graph, persistence, telemetrySource);

    const output = await engine.execute(documentInput);

    expect(output).toEqual(documentOutput);
    expect(persistence.pendingInputs[0]?.inputPayload).toEqual(documentInput);
    expect(persistence.pendingInputs[0]?.requestHash).toEqual(expect.any(String));
    expect(graph.lastContext).toMatchObject({
      executionId: "execution-1",
      stepRecorder: persistence,
    });
    expect(persistence.successInputs[0]?.id).toBe("execution-1");
    expect(persistence.successInputs[0]?.outputPayload).toEqual(documentOutput);
    expect(persistence.failedInputs).toHaveLength(0);
    expect(persistence.telemetryInputs[0]).toMatchObject({
      executionId: "execution-1",
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      openrouterGenerationId: "gen-doc-1",
    });
  });

  it("envia webhook de sucesso e registra step quando callback esta configurado", async () => {
    const graph = new FakeDocumentGraph();
    const persistence = new FakeDocumentExecutionPersistence();
    const webhookNotifier = new FakeDocumentWebhookNotifier();
    const engine = new DocumentEngine(graph, persistence, undefined, webhookNotifier);

    await engine.execute(documentInput);

    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "document",
        execution_id: "execution-1",
        status: "success",
        cache_hit: false,
        output: documentOutput,
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

  it("usa cache hit isolado de document e envia webhook com cache_hit true", async () => {
    const graph = new FakeDocumentGraph();
    const persistence = new FakeDocumentExecutionPersistence();
    const webhookNotifier = new FakeDocumentWebhookNotifier();
    persistence.cachedRecord = {
      id: "execution-original",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "document",
      status: "success",
      inputPayload: documentInput,
      outputPayload: documentOutput,
      durationMs: 900,
      requestHash: "hash-original",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const engine = new DocumentEngine(graph, persistence, undefined, webhookNotifier);

    const output = await engine.execute(documentInput);

    expect(output).toEqual(documentOutput);
    expect(graph.calls).toBe(0);
    expect(persistence.cacheHitInputs[0]).toMatchObject({
      sourceExecutionId: "execution-original",
      outputPayload: documentOutput,
    });
    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "document",
        execution_id: "execution-cache-1",
        status: "success",
        cache_hit: true,
        output: documentOutput,
      },
    ]);
  });

  it("marca execucao como falha quando o grafo quebra", async () => {
    const graph = new FailingDocumentGraph();
    const persistence = new FakeDocumentExecutionPersistence();
    const engine = new DocumentEngine(graph, persistence);

    await expect(engine.execute(documentInput)).rejects.toThrow("falha no llm");

    expect(persistence.successInputs).toHaveLength(0);
    expect(persistence.failedInputs[0]).toMatchObject({
      id: "execution-1",
      errorMessage: "falha no llm",
    });
  });
});
