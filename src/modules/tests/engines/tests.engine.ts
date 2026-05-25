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
import { testsResponseSchema, type AppEnv, type TestsRequest, type TestsResponse } from "@shared";
import { createPayloadHash, loadEnv } from "@shared";
import { TestsFlowGraph, type TestsGraphRunner, type TestsStepRecorder } from "../graphs";
import { TestsPromptCatalog } from "../prompts";
import {
  HttpTestsWebhookNotifier,
  type TestsWebhookNotifier,
  type TestsWebhookPayload,
} from "./tests-webhook.notifier";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";

export interface TestsExecutionPersistence extends TestsStepRecorder {
  createPending(input: CreatePendingExecutionInput<TestsRequest>): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkExecutionSuccessInput<TestsResponse>): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
  findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null>;
  createCacheHit(
    input: CreateCacheHitExecutionInput<TestsRequest, TestsResponse>,
  ): Promise<ReviewExecutionRecord>;
}

export class TestsEngine extends BaseAgentEngine<TestsRequest, TestsResponse> {
  constructor(
    private readonly graph: TestsGraphRunner,
    private readonly persistence?: TestsExecutionPersistence,
    private readonly telemetrySource?: AgentExecutionTelemetrySource,
    private readonly webhookNotifier?: TestsWebhookNotifier,
    private readonly promptResolver: PromptRuntimeResolver = new LegacyPromptRuntimeResolver(),
  ) {
    super("tests");
  }

  static createDefault(input: {
    env?: AppEnv;
    persistence?: TestsExecutionPersistence;
    promptResolver?: PromptRuntimeResolver;
    requestedModel?: string;
  } = {}): TestsEngine {
    const env = input.env ?? loadEnv();
    const requestedModel = input.requestedModel ?? env.OPENROUTER_DEFAULT_MODEL;
    const chatModel = new OpenRouterChatFactory(env).create(requestedModel);
    const telemetryCollector = new AgentTelemetryCollector();
    const structuredOutputRunner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: requestedModel,
      telemetrySink: telemetryCollector,
    });

    return new TestsEngine(
      TestsFlowGraph.createDefault(structuredOutputRunner),
      input.persistence,
      telemetryCollector,
      env.WEBHOOK_CALLBACK_URL
        ? new HttpTestsWebhookNotifier(env.WEBHOOK_CALLBACK_URL)
        : undefined,
      input.promptResolver ?? new LegacyPromptRuntimeResolver(),
    );
  }

  protected async invoke(input: TestsRequest): Promise<TestsResponse> {
    const promptSet = await this.promptResolver.resolveTests(input.prompt_version);
    const promptCatalog = TestsPromptCatalog.fromTemplate(promptSet.agent);

    if (!this.persistence) {
      return this.graph.invoke(input, { promptCatalog });
    }

    const startedAt = dayjs().valueOf();
    const hash = createPayloadHash(input);

    try {
      const cached = await this.persistence.findSuccessByHash(hash);
      if (cached && cached.outputPayload) {
        const cachedOutput = testsResponseSchema.safeParse(cached.outputPayload);
        if (cachedOutput.success) {
          const durationMs = dayjs().valueOf() - startedAt;
          const execution = await this.persistence.createCacheHit({
            inputPayload: input,
            requestHash: hash,
            sourceExecutionId: cached.id,
            outputPayload: cachedOutput.data,
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
            output: cachedOutput.data,
          });

          return cachedOutput.data;
        }
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

  getGraph(): TestsGraphRunner {
    return this.graph;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.telemetrySource;
  }

  getWebhookNotifier(): TestsWebhookNotifier | undefined {
    return this.webhookNotifier;
  }

  private async notifyWebhook(input: {
    executionId: string;
    status: "success" | "failed";
    cacheHit: boolean;
    output?: TestsResponse;
    errorMessage?: string;
  }): Promise<void> {
    if (!this.persistence || !this.webhookNotifier) {
      return;
    }

    const startedAt = dayjs().valueOf();
    const payload: TestsWebhookPayload = input.status === "success"
      ? {
          flow_type: "tests",
          execution_id: input.executionId,
          status: "success",
          cache_hit: input.cacheHit,
          output: input.output as TestsResponse,
        }
      : {
          flow_type: "tests",
          execution_id: input.executionId,
          status: "failed",
          cache_hit: false,
          error_message: input.errorMessage ?? "Erro desconhecido na geracao de testes.",
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
