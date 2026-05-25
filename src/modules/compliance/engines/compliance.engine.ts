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
  CreateCacheHitExecutionInput,
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AppEnv, ComplianceRequest, ComplianceResponse } from "@shared";
import { createPayloadHash, loadEnv } from "@shared";
import { ComplianceFlowGraph, type ComplianceGraphRunner, type ComplianceStepRecorder } from "../graphs";
import { CompliancePromptCatalog } from "../prompts";
import {
  HttpComplianceWebhookNotifier,
  type ComplianceWebhookNotifier,
  type ComplianceWebhookPayload,
} from "./compliance-webhook.notifier";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";

export interface ComplianceExecutionPersistence extends ComplianceStepRecorder {
  createPending(input: CreatePendingExecutionInput<ComplianceRequest>): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkExecutionSuccessInput<ComplianceResponse>): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
  findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null>;
  createCacheHit(
    input: CreateCacheHitExecutionInput<ComplianceRequest, ComplianceResponse>,
  ): Promise<ReviewExecutionRecord>;
}

export class ComplianceEngine extends BaseAgentEngine<ComplianceRequest, ComplianceResponse> {
  constructor(
    private readonly graph: ComplianceGraphRunner,
    private readonly persistence?: ComplianceExecutionPersistence,
    private readonly telemetrySource?: AgentExecutionTelemetrySource,
    private readonly webhookNotifier?: ComplianceWebhookNotifier,
    private readonly promptResolver: PromptRuntimeResolver = new LegacyPromptRuntimeResolver(),
  ) {
    super("compliance");
  }

  static createDefault(input: {
    env?: AppEnv;
    persistence?: ComplianceExecutionPersistence;
    promptResolver?: PromptRuntimeResolver;
  } = {}): ComplianceEngine {
    const env = input.env ?? loadEnv();
    const chatModel = new OpenRouterChatFactory(env).create();
    const telemetryCollector = new AgentTelemetryCollector();
    const structuredOutputRunner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: env.OPENROUTER_DEFAULT_MODEL,
      telemetrySink: telemetryCollector,
    });

    return new ComplianceEngine(
      ComplianceFlowGraph.createDefault(structuredOutputRunner),
      input.persistence,
      telemetryCollector,
      env.WEBHOOK_CALLBACK_URL
        ? new HttpComplianceWebhookNotifier(env.WEBHOOK_CALLBACK_URL)
        : undefined,
      input.promptResolver ?? new LegacyPromptRuntimeResolver(),
    );
  }

  protected async invoke(input: ComplianceRequest): Promise<ComplianceResponse> {
    const promptSet = await this.promptResolver.resolveCompliance(input.prompt_version);
    const promptCatalog = CompliancePromptCatalog.fromTemplate(promptSet.agent);

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
          outputPayload: cached.outputPayload as ComplianceResponse,
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
          output: cached.outputPayload as ComplianceResponse,
        });

        return cached.outputPayload as ComplianceResponse;
      }
    } catch {
      // Falhas no cache nao impedem o fluxo principal
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

  getGraph(): ComplianceGraphRunner {
    return this.graph;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.telemetrySource;
  }

  getWebhookNotifier(): ComplianceWebhookNotifier | undefined {
    return this.webhookNotifier;
  }

  private async notifyWebhook(input: {
    executionId: string;
    status: "success" | "failed";
    cacheHit: boolean;
    output?: ComplianceResponse;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.persistence || !this.webhookNotifier) {
      return;
    }

    const startedAt = dayjs().valueOf();
    const payload: ComplianceWebhookPayload = input.status === "success"
      ? {
          flow_type: "compliance",
          execution_id: input.executionId,
          status: "success",
          cache_hit: input.cacheHit,
          output: input.output as ComplianceResponse,
        }
      : {
          flow_type: "compliance",
          execution_id: input.executionId,
          status: "failed",
          cache_hit: false,
          error_message: input.errorMessage ?? "Erro desconhecido no compliance.",
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
