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
  CreatePendingExecutionInput,
  MarkExecutionFailedInput,
  MarkExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AppEnv, ComplianceRequest, ComplianceResponse } from "@shared";
import { createPayloadHash, loadEnv } from "@shared";
import { ComplianceFlowGraph, type ComplianceGraphRunner, type ComplianceStepRecorder } from "../graphs";

export interface ComplianceExecutionPersistence extends ComplianceStepRecorder {
  createPending(input: CreatePendingExecutionInput<ComplianceRequest>): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkExecutionSuccessInput<ComplianceResponse>): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkExecutionFailedInput): Promise<ReviewExecutionRecord>;
  recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void>;
}

export class ComplianceEngine extends BaseAgentEngine<ComplianceRequest, ComplianceResponse> {
  constructor(
    private readonly graph: ComplianceGraphRunner,
    private readonly persistence?: ComplianceExecutionPersistence,
    private readonly telemetrySource?: AgentExecutionTelemetrySource,
  ) {
    super("compliance");
  }

  static createDefault(input: {
    env?: AppEnv;
    persistence?: ComplianceExecutionPersistence;
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
    );
  }

  protected async invoke(input: ComplianceRequest): Promise<ComplianceResponse> {
    if (!this.persistence) {
      return this.graph.invoke(input);
    }

    const startedAt = dayjs().valueOf();
    const execution = await this.persistence.createPending({
      inputPayload: input,
      requestHash: createPayloadHash(input),
    });

    try {
      const output = await this.graph.invoke(input, {
        executionId: execution.id,
        stepRecorder: this.persistence,
      });
      await this.persistence.markSuccess({
        id: execution.id,
        outputPayload: output,
        durationMs: dayjs().valueOf() - startedAt,
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
      throw handledError;
    }
  }

  getGraph(): ComplianceGraphRunner {
    return this.graph;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.telemetrySource;
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
