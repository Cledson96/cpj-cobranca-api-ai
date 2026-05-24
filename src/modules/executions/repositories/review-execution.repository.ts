import { toSaoPauloIso } from "@shared";
import type {
  CreatePendingReviewExecutionInput,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  ReviewExecution,
  ReviewExecutionListItem,
  ReviewExecutionRecord,
  ReviewExecutionRepositoryPrisma,
} from "@/modules/executions/models";

export class ReviewExecutionRepository {
  constructor(private readonly prisma: ReviewExecutionRepositoryPrisma) {}

  async createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.create({
      data: {
        flowType: "review",
        status: "pending",
        inputPayload: input.inputPayload,
        requestHash: input.requestHash,
      },
    });
  }

  async markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.update({
      where: { id: input.id, flowType: "review" },
      data: {
        status: "success",
        outputPayload: input.outputPayload,
        durationMs: input.durationMs,
        errorMessage: null,
      },
    });
  }

  async markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord> {
    return this.prisma.execution.update({
      where: { id: input.id, flowType: "review" },
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

  async findById(id: string): Promise<ReviewExecution | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id, flowType: "review" },
    });

    return execution ? mapReviewExecutionDetail(execution) : null;
  }

  async listLatest(take = 20): Promise<ReviewExecutionListItem[]> {
    const executions = await this.prisma.execution.findMany({
      where: { flowType: "review" },
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
      },
    });

    return executions.map(mapReviewExecutionListItem);
  }
}

function mapReviewExecutionDetail(execution: ReviewExecutionRecord): ReviewExecution {
  return {
    ...mapReviewExecutionListItem(execution),
    input_payload: execution.inputPayload ?? null,
    output_payload: execution.outputPayload ?? null,
    error_message: execution.errorMessage ?? null,
  };
}

function mapReviewExecutionListItem(execution: ReviewExecutionRecord): ReviewExecutionListItem {
  return {
    id: execution.id,
    type: execution.flowType,
    status: execution.status,
    timestamp: toSaoPauloIso(execution.createdAt),
    duration_ms: execution.durationMs,
    cache_hit: execution.cacheHit,
    source_execution_id: execution.sourceExecutionId,
  };
}
