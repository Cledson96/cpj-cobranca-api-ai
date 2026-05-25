import dayjs from "dayjs";
import { createPayloadHash, pullRequestReviewResponseSchema, type PullRequestReviewRequest, type PullRequestReviewResponse } from "@shared";
import { handleUnknownError } from "@/infrastructure/errors";
import type { ModelRuntimeResolver } from "@/modules/models";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";
import type {
  CreateCacheHitExecutionInput,
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionStepInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import { PullRequestReviewFlowGraph, type PullRequestReviewGraphRunner } from "./graph";
import type {
  CodeStandardsLoader,
  GitHubPullRequestClient,
  JiraIssueClient,
  PullRequestReviewService,
} from "./models";

export interface PullRequestReviewExecutionPersistence {
  createPending(input: CreatePendingExecutionInput<PullRequestReviewRequest>): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkExecutionSuccessInput<PullRequestReviewResponse>): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
  findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null>;
  createCacheHit(
    input: CreateCacheHitExecutionInput<PullRequestReviewRequest, PullRequestReviewResponse>,
  ): Promise<ReviewExecutionRecord>;
}

export type DefaultPullRequestReviewServiceDependencies = {
  githubClient?: GitHubPullRequestClient;
  jiraClient?: JiraIssueClient;
  standardsLoader?: CodeStandardsLoader;
  graph?: PullRequestReviewGraphRunner;
  persistence?: PullRequestReviewExecutionPersistence;
  promptResolver?: PromptRuntimeResolver;
  modelResolver?: ModelRuntimeResolver;
};

export class DefaultPullRequestReviewService implements PullRequestReviewService {
  constructor(private readonly dependencies: DefaultPullRequestReviewServiceDependencies = {}) {}

  async execute(input: PullRequestReviewRequest): Promise<PullRequestReviewResponse> {
    const startedAt = dayjs().valueOf();
    const hash = createPayloadHash(input);
    const persistence = this.dependencies.persistence;

    if (persistence) {
      const cached = await persistence.findSuccessByHash(hash);
      const cachedOutput = pullRequestReviewResponseSchema.safeParse(cached?.outputPayload);
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
      const promptSet = await this.resolvePromptSet(input.prompt_version);
      const graph = this.createGraph(resolvedModel);
      const output = await graph.invoke(input, {
        executionId: execution?.id,
        stepRecorder: persistence,
        promptSet,
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

  private async resolveModel(model?: string): Promise<string | undefined> {
    if (!this.dependencies.modelResolver) {
      return model;
    }

    return this.dependencies.modelResolver.resolveRequestedModel(model);
  }

  private async resolvePromptSet(promptVersion?: number) {
    return (this.dependencies.promptResolver ?? new LegacyPromptRuntimeResolver())
      .resolvePullRequestReview(promptVersion);
  }

  private createGraph(resolvedModel?: string): PullRequestReviewGraphRunner {
    if (this.dependencies.graph) {
      return this.dependencies.graph;
    }

    return PullRequestReviewFlowGraph.createDefault({
      requestedModel: resolvedModel,
      githubClient: this.dependencies.githubClient,
      jiraClient: this.dependencies.jiraClient,
      standardsLoader: this.dependencies.standardsLoader,
    });
  }

  private async recordTelemetry(
    executionId: string,
    graph: PullRequestReviewGraphRunner,
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
