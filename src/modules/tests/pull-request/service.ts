import dayjs from "dayjs";
import {
  createPayloadHash,
  testsResponseSchema,
  type PullRequestTestsRequest,
  type TestsResponse,
} from "@shared";
import { handleUnknownError } from "@/infrastructure/errors";
import type {
  CreateCacheHitExecutionInput,
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { ModelRuntimeResolver } from "@/modules/models";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";
import { TestsPromptCatalog } from "@/modules/tests/prompts";
import {
  PullRequestTestsFlowGraph,
  type PullRequestTestsGraphRunner,
} from "./graph";

export interface PullRequestTestsExecutionPersistence {
  createPending(input: CreatePendingExecutionInput<PullRequestTestsRequest>): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkExecutionSuccessInput<TestsResponse>): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
  findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null>;
  createCacheHit(
    input: CreateCacheHitExecutionInput<PullRequestTestsRequest, TestsResponse>,
  ): Promise<ReviewExecutionRecord>;
}

export interface PullRequestTestsService {
  execute(input: PullRequestTestsRequest): Promise<TestsResponse>;
}

export type DefaultPullRequestTestsServiceDependencies = {
  graph?: PullRequestTestsGraphRunner;
  persistence?: PullRequestTestsExecutionPersistence;
  promptResolver?: PromptRuntimeResolver;
  modelResolver?: ModelRuntimeResolver;
};

export class DefaultPullRequestTestsService implements PullRequestTestsService {
  constructor(private readonly dependencies: DefaultPullRequestTestsServiceDependencies = {}) {}

  async execute(input: PullRequestTestsRequest): Promise<TestsResponse> {
    const startedAt = dayjs().valueOf();
    const hash = createPayloadHash(input);
    const persistence = this.dependencies.persistence;

    if (persistence) {
      const cached = await persistence.findSuccessByHash(hash);
      const cachedOutput = testsResponseSchema.safeParse(cached?.outputPayload);
      if (cached && cachedOutput.success) {
        await persistence.createCacheHit({
          inputPayload: input,
          requestHash: hash,
          sourceExecutionId: cached.id,
          outputPayload: cachedOutput.data,
          durationMs: dayjs().valueOf() - startedAt,
        });
        return cachedOutput.data;
      }
    }

    const execution = persistence
      ? await persistence.createPending({ inputPayload: input, requestHash: hash })
      : null;

    try {
      const resolvedModel = await this.resolveModel(input.model);
      const promptSet = await this.resolvePrompt(input.prompt_version);
      const graph = this.createGraph(resolvedModel);
      const output = await graph.invoke(input, {
        executionId: execution?.id,
        stepRecorder: persistence,
        promptCatalog: TestsPromptCatalog.fromTemplate(promptSet.agent),
        resolvedModel,
      });

      if (persistence && execution) {
        await persistence.markSuccess({
          id: execution.id,
          outputPayload: output,
          durationMs: dayjs().valueOf() - startedAt,
        });
        await this.recordTelemetry(execution.id, graph);
      }

      return output;
    } catch (error) {
      const handledError = handleUnknownError(error);
      if (persistence && execution) {
        await persistence.markFailed({
          id: execution.id,
          errorMessage: handledError.message,
          durationMs: dayjs().valueOf() - startedAt,
        });
      }
      throw handledError;
    }
  }

  private async resolveModel(requestedModel?: string): Promise<string | undefined> {
    if (!this.dependencies.modelResolver) {
      return requestedModel;
    }

    return this.dependencies.modelResolver.resolveRequestedModel(requestedModel);
  }

  private async resolvePrompt(promptVersion?: number) {
    return (this.dependencies.promptResolver ?? new LegacyPromptRuntimeResolver())
      .resolveTests(promptVersion);
  }

  private createGraph(resolvedModel?: string): PullRequestTestsGraphRunner {
    if (this.dependencies.graph) {
      return this.dependencies.graph;
    }

    return PullRequestTestsFlowGraph.createDefault({
      requestedModel: resolvedModel,
    });
  }

  private async recordTelemetry(
    executionId: string,
    graph: PullRequestTestsGraphRunner,
  ): Promise<void> {
    const telemetry = graph.getTelemetrySource?.()?.snapshot();
    if (!telemetry) {
      return;
    }

    await this.dependencies.persistence?.recordTelemetry({
      executionId,
      provider: telemetry.provider,
      modelRequested: telemetry.modelRequested,
      modelUsed: telemetry.modelUsed,
      openrouterGenerationId: telemetry.generationIds[0] ?? null,
      promptTokens: telemetry.promptTokens,
      completionTokens: telemetry.completionTokens,
      totalTokens: telemetry.totalTokens,
      costUsd: telemetry.costUsd === null ? null : telemetry.costUsd.toString(),
      inputCostUsd: telemetry.inputCostUsd === null ? null : telemetry.inputCostUsd.toString(),
      outputCostUsd: telemetry.outputCostUsd === null ? null : telemetry.outputCostUsd.toString(),
      cacheReadTokens: telemetry.cacheReadTokens,
    });
  }
}
