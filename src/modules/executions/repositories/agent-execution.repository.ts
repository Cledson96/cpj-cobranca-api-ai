import { toSaoPauloIso } from "@shared";
import type {
  AgentExecutionFlowType,
  AgentExecutionRepositoryPrisma,
  CreateCacheHitExecutionInput,
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecution,
  ReviewExecutionListItem,
  ReviewExecutionRecord,
  ReviewExecutionStep,
  ReviewExecutionTelemetry,
} from "@/modules/executions/models";

export class AgentExecutionRepository<TInput = unknown, TOutput = unknown> {
  constructor(
    private readonly prisma: AgentExecutionRepositoryPrisma,
    private readonly flowType: AgentExecutionFlowType,
  ) {}

  async createPending(input: CreatePendingExecutionInput<TInput>): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.create({
      data: {
        flowType: this.flowType,
        status: "pending",
        inputPayload: input.inputPayload,
        requestHash: input.requestHash,
      },
    });
  }

  async markSuccess(input: MarkExecutionSuccessInput<TOutput>): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.update({
      where: { id: input.id, flowType: this.flowType },
      data: {
        status: "success",
        outputPayload: input.outputPayload,
        durationMs: input.durationMs,
        errorMessage: null,
      },
    });
  }

  async markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.update({
      where: { id: input.id, flowType: this.flowType },
      data: {
        status: "failed",
        outputPayload: undefined,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage,
      },
    });
  }

  async recordStep(input: RecordReviewExecutionStepInput): Promise<void> {
    await this.prisma.executionStep.create({
      data: {
        executionId: input.executionId,
        nodeName: input.nodeName,
        kind: input.kind,
        status: input.status,
        inputPayload: input.inputPayload,
        outputPayload: input.outputPayload,
        durationMs: input.durationMs,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  async recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void> {
    const data = {
      executionId: input.executionId,
      provider: input.provider,
      modelRequested: input.modelRequested,
      modelUsed: input.modelUsed ?? null,
      openrouterGenerationId: input.openrouterGenerationId ?? null,
      promptTokens: input.promptTokens ?? null,
      completionTokens: input.completionTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      costUsd: input.costUsd ?? null,
      inputCostUsd: input.inputCostUsd ?? null,
      outputCostUsd: input.outputCostUsd ?? null,
      cacheReadTokens: input.cacheReadTokens ?? null,
    };

    await this.prisma.executionTelemetry.upsert({
      where: { executionId: input.executionId },
      create: data,
      update: withoutExecutionId(data),
    });
  }

  async findById(id: string): Promise<ReviewExecution | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id, flowType: this.flowType },
      include: {
        telemetry: true,
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return execution ? mapExecutionDetail(execution) : null;
  }

  async listLatest(take = 20): Promise<ReviewExecutionListItem[]> {
    const executions = await this.prisma.execution.findMany({
      where: { flowType: this.flowType },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        flowType: true,
        status: true,
        durationMs: true,
        cacheHit: true,
        sourceExecutionId: true,
        telemetry: true,
        steps: {
          orderBy: { createdAt: "asc" },
          select: {
            nodeName: true,
            kind: true,
            status: true,
            durationMs: true,
          },
        },
      },
    });

    return executions.map(mapExecutionListItem);
  }

  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    const executions = await this.prisma.execution.findMany({
      where: {
        flowType: this.flowType,
        status: "success",
        requestHash,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    return executions[0] ?? null;
  }

  async createCacheHit(input: CreateCacheHitExecutionInput<TInput, TOutput>): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.create({
      data: {
        flowType: this.flowType,
        status: "success",
        inputPayload: input.inputPayload,
        outputPayload: input.outputPayload,
        requestHash: input.requestHash,
        cacheHit: true,
        sourceExecutionId: input.sourceExecutionId,
        durationMs: input.durationMs,
      },
    });
  }
}

function mapExecutionDetail(execution: ReviewExecutionRecord): ReviewExecution {
  return {
    ...mapExecutionListItem(execution),
    input_payload: execution.inputPayload ?? null,
    output_payload: execution.outputPayload ?? null,
    error_message: execution.errorMessage ?? null,
    steps: Array.isArray(execution.steps) ? execution.steps.map(mapExecutionStep) : [],
  };
}

function mapExecutionListItem(execution: ReviewExecutionRecord): ReviewExecutionListItem {
  return {
    id: execution.id,
    type: execution.flowType,
    status: execution.status,
    timestamp: toSaoPauloIso(execution.createdAt),
    duration_ms: execution.durationMs,
    cache_hit: execution.cacheHit,
    source_execution_id: execution.sourceExecutionId,
    telemetry: mapExecutionTelemetry(execution.telemetry),
    steps: Array.isArray(execution.steps) ? execution.steps.map(mapExecutionStepSummary) : [],
  };
}

function mapExecutionTelemetry(input: ReviewExecutionRecord["telemetry"]): ReviewExecutionTelemetry | null {
  if (!input) {
    return null;
  }

  return {
    provider: input.provider,
    model_requested: input.modelRequested,
    model_used: input.modelUsed ?? null,
    openrouter_generation_id: input.openrouterGenerationId ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    cost_total_usd: toNullableNumber(input.costUsd),
    cost_input_usd: toNullableNumber(input.inputCostUsd),
    cost_output_usd: toNullableNumber(input.outputCostUsd),
    cache_read_tokens: input.cacheReadTokens ?? null,
  };
}

function mapExecutionStep(input: NonNullable<ReviewExecutionRecord["steps"]>[number]): ReviewExecutionStep {
  return {
    id: input.id,
    timestamp: toSaoPauloIso(input.createdAt),
    node_name: input.nodeName,
    kind: input.kind,
    status: input.status,
    duration_ms: input.durationMs,
    input_payload: input.inputPayload ?? null,
    output_payload: input.outputPayload ?? null,
    error_message: input.errorMessage ?? null,
  };
}

function mapExecutionStepSummary(input: NonNullable<ReviewExecutionRecord["steps"]>[number]) {
  return {
    node_name: input.nodeName,
    kind: input.kind,
    status: input.status,
    duration_ms: input.durationMs,
  };
}

function withoutExecutionId(
  data: RecordReviewExecutionTelemetryInput,
): Omit<RecordReviewExecutionTelemetryInput, "executionId"> {
  return {
    provider: data.provider,
    modelRequested: data.modelRequested,
    modelUsed: data.modelUsed,
    openrouterGenerationId: data.openrouterGenerationId,
    promptTokens: data.promptTokens,
    completionTokens: data.completionTokens,
    totalTokens: data.totalTokens,
    costUsd: data.costUsd,
    inputCostUsd: data.inputCostUsd,
    outputCostUsd: data.outputCostUsd,
    cacheReadTokens: data.cacheReadTokens,
  };
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return toFiniteNumber(value);
  }

  if (typeof value === "object" && value !== null) {
    return toFiniteNumber(value.toString());
  }

  return null;
}

function toFiniteNumber(value: string): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
