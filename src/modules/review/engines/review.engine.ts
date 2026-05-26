import {
  AgentTelemetryCollector,
  BaseAgentEngine,
  LangChainStructuredOutputRunner,
  OpenRouterChatFactory,
  OpenRouterGenerationStatsClient,
  type AgentExecutionTelemetrySource,
} from "@/modules/agent";
import dayjs from "dayjs";
import { handleUnknownError } from "@/infrastructure/errors";
import type {
  CreatePendingReviewExecutionInput,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AppEnv, ReviewRequest, ReviewResponse } from "@shared";
import { createPayloadHash, loadEnv } from "@shared";
import { ReviewPromptCatalog } from "../prompts";
import { LanguageRouter } from "../language";
import {
  ReviewFlowGraph,
  ReviewJavaScriptGraph,
  ReviewPhpGraph,
  ReviewPythonGraph,
  ReviewTypeScriptGraph,
  type ReviewGraphRunner,
  type ReviewStepRecorder,
} from "../graphs";
import {
  HttpReviewWebhookNotifier,
  type ReviewWebhookNotifier,
  type ReviewWebhookPayload,
} from "./review-webhook.notifier";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";

export interface ReviewExecutionPersistence extends ReviewStepRecorder {
  createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
  findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null>;
  createCacheHit(input: {
    inputPayload: ReviewRequest;
    requestHash: string;
    sourceExecutionId: string;
    outputPayload: ReviewResponse;
    durationMs: number;
  }): Promise<ReviewExecutionRecord>;
}

export class ReviewEngine extends BaseAgentEngine<ReviewRequest, ReviewResponse> {
  constructor(
    private readonly graph: ReviewGraphRunner,
    private readonly persistence?: ReviewExecutionPersistence,
    private readonly telemetrySource?: AgentExecutionTelemetrySource,
    private readonly webhookNotifier?: ReviewWebhookNotifier,
    private readonly promptResolver: PromptRuntimeResolver = new LegacyPromptRuntimeResolver(),
  ) {
    super("review");
  }

  static createDefault(input: {
    env?: AppEnv;
    persistence?: ReviewExecutionPersistence;
    promptResolver?: PromptRuntimeResolver;
    requestedModel?: string;
  } = {}): ReviewEngine {
    const env = input.env ?? loadEnv();
    const requestedModel = input.requestedModel ?? env.OPENROUTER_DEFAULT_MODEL;
    const chatModel = new OpenRouterChatFactory(env).create(requestedModel);
    const telemetryCollector = new AgentTelemetryCollector();
    const structuredOutputRunner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: requestedModel,
      retryAttempts: env.EXTERNAL_RETRY_ATTEMPTS,
      retryBaseDelayMs: env.EXTERNAL_RETRY_BASE_DELAY_MS,
      telemetrySink: telemetryCollector,
    });

    return new ReviewEngine(
      new ReviewFlowGraph({
        languageRouter: new LanguageRouter(),
        languageGraphs: {
          typescript: new ReviewTypeScriptGraph(structuredOutputRunner),
          javascript: new ReviewJavaScriptGraph(structuredOutputRunner),
          python: new ReviewPythonGraph(structuredOutputRunner),
          php: new ReviewPhpGraph(structuredOutputRunner),
        },
      }),
      input.persistence,
      telemetryCollector,
      env.WEBHOOK_CALLBACK_URL
        ? new HttpReviewWebhookNotifier(env.WEBHOOK_CALLBACK_URL, fetch, {
            attempts: env.EXTERNAL_RETRY_ATTEMPTS,
            baseDelayMs: env.EXTERNAL_RETRY_BASE_DELAY_MS,
          })
        : undefined,
      input.promptResolver ?? new LegacyPromptRuntimeResolver(),
    );
  }

  protected async invoke(input: ReviewRequest): Promise<ReviewResponse> {
    const promptSet = await this.promptResolver.resolveReview(input.prompt_version);
    const promptCatalog = ReviewPromptCatalog.fromTemplates({
      specialists: {
        naming_clarity: promptSet.naming_clarity,
        error_handling: promptSet.error_handling,
        resource_leak: promptSet.resource_leak,
        complexity: promptSet.complexity,
        security: promptSet.security,
      },
      aggregator: promptSet.aggregator,
    });

    if (!this.persistence) {
      return this.graph.invoke(input, { promptCatalog });
    }

    const startedAt = dayjs().valueOf();
    const hash = createPayloadHash(input);

    try {
      const cached = await this.persistence.findSuccessByHash(hash);
      if (cached && cached.outputPayload) {
        const durationMs = dayjs().valueOf() - startedAt;
        const execution = await this.persistence.createCacheHit({
          inputPayload: input,
          requestHash: hash,
          sourceExecutionId: cached.id,
          outputPayload: cached.outputPayload as ReviewResponse,
          durationMs,
        });

        await this.persistence.recordStep({
          executionId: execution.id,
          nodeName: "cache_lookup",
          kind: "cache",
          status: "success",
          inputPayload: { requestHash: hash },
          outputPayload: { cacheHit: true, sourceExecutionId: cached.id },
          durationMs,
        });

        await this.notifyWebhook({
          executionId: execution.id,
          status: "success",
          cacheHit: true,
          output: cached.outputPayload as ReviewResponse,
        });

        return cached.outputPayload as ReviewResponse;
      }
    } catch {
      // Falhas no cache não impedem o fluxo principal
    }

    const execution = await this.persistence.createPending({
      inputPayload: input,
      requestHash: hash,
    });

    try {
      const lookupDuration = dayjs().valueOf() - startedAt;
      await this.persistence.recordStep({
        executionId: execution.id,
        nodeName: "cache_lookup",
        kind: "cache",
        status: "success",
        inputPayload: { requestHash: hash },
        outputPayload: { cacheHit: false },
        durationMs: lookupDuration,
      });

      const output = await this.graph.invoke(input, {
        executionId: execution.id,
        stepRecorder: this.persistence,
        promptCatalog,
      });
      await this.persistence.markSuccess({
        id: execution.id,
        outputPayload: output,
        durationMs: dayjs().valueOf() - startedAt,
      });
      await this.notifyWebhook({
        executionId: execution.id,
        status: "success",
        cacheHit: false,
        output,
      });
      await this.recordTelemetry(execution.id);

      return output;
    } catch (error) {
      const handledError = handleUnknownError(error);
      await this.persistence.markFailed({
        id: execution.id,
        errorMessage: handledError.message,
        durationMs: dayjs().valueOf() - startedAt,
      });
      await this.notifyWebhook({
        executionId: execution.id,
        status: "failed",
        cacheHit: false,
        errorMessage: handledError.message,
      });
      throw handledError;
    }
  }

  private async notifyWebhook(input: {
    executionId: string;
    status: "success" | "failed";
    cacheHit: boolean;
    output?: ReviewResponse;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.persistence || !this.webhookNotifier) {
      return;
    }

    const startedAt = dayjs().valueOf();
    const payload: ReviewWebhookPayload = input.status === "success"
      ? {
          flow_type: "review",
          execution_id: input.executionId,
          status: "success",
          cache_hit: input.cacheHit,
          output: input.output as ReviewResponse,
        }
      : {
          flow_type: "review",
          execution_id: input.executionId,
          status: "failed",
          cache_hit: false,
          error_message: input.errorMessage ?? "Erro desconhecido no review.",
        };

    try {
      await this.webhookNotifier.notify(payload);
      await this.persistence.recordStep({
        executionId: input.executionId,
        nodeName: "webhook_callback",
        kind: "webhook",
        status: "success",
        inputPayload: {
          status: payload.status,
          cacheHit: payload.cache_hit,
        },
        outputPayload: { delivered: true },
        durationMs: dayjs().valueOf() - startedAt,
      });
    } catch (error) {
      await this.persistence.recordStep({
        executionId: input.executionId,
        nodeName: "webhook_callback",
        kind: "webhook",
        status: "failed",
        inputPayload: {
          status: payload.status,
          cacheHit: payload.cache_hit,
        },
        durationMs: dayjs().valueOf() - startedAt,
        errorMessage: getErrorMessage(error),
      });
    }
  }

  private async recordTelemetry(executionId: string): Promise<void> {
    if (!this.persistence || !this.telemetrySource) {
      return;
    }

    const telemetry = this.telemetrySource.snapshot();
    if (!telemetry) {
      return;
    }

    await this.persistence.recordTelemetry({
      executionId,
      provider: telemetry.provider,
      modelRequested: telemetry.modelRequested,
      modelUsed: telemetry.modelUsed,
      openrouterGenerationId: telemetry.generationIds[0] ?? null,
      promptTokens: telemetry.promptTokens,
      completionTokens: telemetry.completionTokens,
      totalTokens: telemetry.totalTokens,
      costUsd: toNullableUsdString(telemetry.costUsd),
      inputCostUsd: toNullableUsdString(telemetry.inputCostUsd),
      outputCostUsd: toNullableUsdString(telemetry.outputCostUsd),
      cacheReadTokens: telemetry.cacheReadTokens,
    });
  }

  getGraph(): ReviewGraphRunner {
    return this.graph;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.telemetrySource;
  }

  getWebhookNotifier(): ReviewWebhookNotifier | undefined {
    return this.webhookNotifier;
  }

  getPromptResolver(): PromptRuntimeResolver {
    return this.promptResolver;
  }
}


function toNullableUsdString(value: number | null): string | null {
  return value === null ? null : value.toString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no webhook callback.";
}
