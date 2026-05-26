import { toSaoPauloIso } from "@shared";
import type { HistoryListQuery } from "@shared";
import type {
  PrismaExecutionDelegate,
  ReviewExecution,
  ReviewExecutionListItem,
  ReviewExecutionRecord,
  ReviewExecutionStep,
  ReviewExecutionTelemetry,
} from "@/modules/executions/models";

export type ExecutionHistoryRepositoryPrisma = {
  execution: Pick<PrismaExecutionDelegate, "findUnique" | "findMany">;
};

export class ExecutionHistoryRepository {
  constructor(private readonly prisma: ExecutionHistoryRepositoryPrisma) {}

  async findById(id: string): Promise<ReviewExecution | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        telemetry: true,
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return execution ? mapExecutionDetail(execution) : null;
  }

  async listLatest(input: number | HistoryListQuery = 20): Promise<ReviewExecutionListItem[]> {
    const options = typeof input === "number" ? { limit: input } : input;
    const executions = await this.prisma.execution.findMany({
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 20,
      ...createCursorArgs(options.cursor),
      ...createWhereArgs(options),
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
}

function createCursorArgs(cursor?: string) {
  if (!cursor) {
    return {};
  }

  return {
    cursor: { id: cursor },
    skip: 1,
  };
}

function createWhereArgs(input: HistoryListQuery) {
  const where: Record<string, unknown> = {};

  if (input.flow_type) {
    where.flowType = input.flow_type;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.cache_hit !== undefined) {
    where.cacheHit = input.cache_hit;
  }

  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: new Date(input.from) } : {}),
      ...(input.to ? { lte: new Date(input.to) } : {}),
    };
  }

  if (input.model) {
    where.telemetry = {
      is: {
        modelRequested: input.model,
      },
    };
  }

  return Object.keys(where).length > 0 ? { where } : {};
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
