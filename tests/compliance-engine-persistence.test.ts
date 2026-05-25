import { describe, expect, it } from "vitest";
import {
  ComplianceEngine,
  type ComplianceExecutionPersistence,
  type ComplianceWebhookNotifier,
  type ComplianceWebhookPayload,
} from "@/modules/compliance/engines";
import type { ComplianceGraphRunContext, ComplianceGraphRunner } from "@/modules/compliance/graphs";
import type { ComplianceRequest, ComplianceResponse } from "@shared";
import type {
  CreatePendingExecutionInput,
  CreateCacheHitExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AgentExecutionTelemetrySource } from "@/modules/agent";

const complianceInput: ComplianceRequest = {
  task_description: "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
  code: "if (contract.active) { renegotiate(contract); audit(contract.id); }",
  language: "typescript",
};

const complianceOutput: ComplianceResponse = {
  compliant: true,
  compliance_score: 95,
  covered_requirements: [
    "Valida contrato ativo antes da renegociacao.",
    "Registra auditoria da renegociacao.",
  ],
  missing_requirements: [],
  partial_requirements: [],
  verdict: "Aderente.",
};

class FakeComplianceGraph implements ComplianceGraphRunner {
  lastContext?: ComplianceGraphRunContext;
  calls = 0;

  async invoke(_input: ComplianceRequest, context?: ComplianceGraphRunContext): Promise<ComplianceResponse> {
    this.calls += 1;
    this.lastContext = context;
    return complianceOutput;
  }
}

class FailingComplianceGraph implements ComplianceGraphRunner {
  lastContext?: ComplianceGraphRunContext;

  async invoke(_input: ComplianceRequest, context?: ComplianceGraphRunContext): Promise<ComplianceResponse> {
    this.lastContext = context;
    throw new Error("falha no llm");
  }
}

class FakeComplianceExecutionPersistence implements ComplianceExecutionPersistence {
  readonly pendingInputs: Array<CreatePendingExecutionInput<ComplianceRequest>> = [];
  readonly cacheHitInputs: Array<CreateCacheHitExecutionInput<ComplianceRequest, ComplianceResponse>> = [];
  readonly successInputs: Array<MarkExecutionSuccessInput<ComplianceResponse>> = [];
  readonly failedInputs: MarkExecutionFailedInput[] = [];
  readonly stepInputs: RecordReviewExecutionStepInput[] = [];
  readonly telemetryInputs: RecordReviewExecutionTelemetryInput[] = [];
  cachedRecord: ReviewExecutionRecord | null = null;

  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    void requestHash;
    return this.cachedRecord;
  }

  async createPending(input: CreatePendingExecutionInput<ComplianceRequest>): Promise<ReviewExecutionRecord> {
    this.pendingInputs.push(input);
    return {
      id: "execution-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "compliance",
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
    input: CreateCacheHitExecutionInput<ComplianceRequest, ComplianceResponse>,
  ): Promise<ReviewExecutionRecord> {
    this.cacheHitInputs.push(input);
    return {
      id: "execution-cache-1",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "compliance",
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

  async markSuccess(input: MarkExecutionSuccessInput<ComplianceResponse>): Promise<ReviewExecutionRecord> {
    this.successInputs.push(input);
    return {
      id: input.id,
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "compliance",
      status: "success",
      inputPayload: complianceInput,
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
      flowType: "compliance",
      status: "failed",
      inputPayload: complianceInput,
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
      generationIds: ["gen-1"],
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

class FakeComplianceWebhookNotifier implements ComplianceWebhookNotifier {
  readonly payloads: ComplianceWebhookPayload[] = [];

  constructor(private readonly failWith?: Error) {}

  async notify(payload: ComplianceWebhookPayload): Promise<void> {
    this.payloads.push(payload);
    if (this.failWith) {
      throw this.failWith;
    }
  }
}

describe("ComplianceEngine com persistencia", () => {
  it("cria execucao pendente, envia contexto ao grafo e marca sucesso", async () => {
    const graph = new FakeComplianceGraph();
    const persistence = new FakeComplianceExecutionPersistence();
    const telemetrySource = new FakeTelemetrySource();
    const engine = new ComplianceEngine(graph, persistence, telemetrySource);

    const output = await engine.execute(complianceInput);

    expect(output).toEqual(complianceOutput);
    expect(persistence.pendingInputs[0]?.inputPayload).toEqual(complianceInput);
    expect(persistence.pendingInputs[0]?.requestHash).toEqual(expect.any(String));
    expect(graph.lastContext).toMatchObject({
      executionId: "execution-1",
      stepRecorder: persistence,
    });
    expect(persistence.successInputs[0]?.id).toBe("execution-1");
    expect(persistence.successInputs[0]?.outputPayload).toEqual(complianceOutput);
    expect(persistence.failedInputs).toHaveLength(0);
    expect(persistence.telemetryInputs[0]).toMatchObject({
      executionId: "execution-1",
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      openrouterGenerationId: "gen-1",
    });
  });

  it("envia webhook de sucesso e registra step quando callback esta configurado", async () => {
    const graph = new FakeComplianceGraph();
    const persistence = new FakeComplianceExecutionPersistence();
    const webhookNotifier = new FakeComplianceWebhookNotifier();
    const engine = new ComplianceEngine(graph, persistence, undefined, webhookNotifier);

    await engine.execute(complianceInput);

    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "compliance",
        execution_id: "execution-1",
        status: "success",
        cache_hit: false,
        output: complianceOutput,
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

  it("usa cache hit isolado de compliance e envia webhook com cache_hit true", async () => {
    const graph = new FakeComplianceGraph();
    const persistence = new FakeComplianceExecutionPersistence();
    const webhookNotifier = new FakeComplianceWebhookNotifier();
    persistence.cachedRecord = {
      id: "execution-original",
      createdAt: "2026-05-24T12:00:00.000Z",
      flowType: "compliance",
      status: "success",
      inputPayload: complianceInput,
      outputPayload: complianceOutput,
      durationMs: 900,
      requestHash: "hash-original",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const engine = new ComplianceEngine(graph, persistence, undefined, webhookNotifier);

    const output = await engine.execute(complianceInput);

    expect(output).toEqual(complianceOutput);
    expect(graph.calls).toBe(0);
    expect(persistence.cacheHitInputs[0]).toMatchObject({
      sourceExecutionId: "execution-original",
      outputPayload: complianceOutput,
    });
    expect(webhookNotifier.payloads).toEqual([
      {
        flow_type: "compliance",
        execution_id: "execution-cache-1",
        status: "success",
        cache_hit: true,
        output: complianceOutput,
      },
    ]);
  });

  it("marca execucao como falha quando o grafo quebra", async () => {
    const graph = new FailingComplianceGraph();
    const persistence = new FakeComplianceExecutionPersistence();
    const engine = new ComplianceEngine(graph, persistence);

    await expect(engine.execute(complianceInput)).rejects.toThrow("falha no llm");

    expect(persistence.successInputs).toHaveLength(0);
    expect(persistence.failedInputs[0]).toMatchObject({
      id: "execution-1",
      errorMessage: "falha no llm",
    });
  });
});
