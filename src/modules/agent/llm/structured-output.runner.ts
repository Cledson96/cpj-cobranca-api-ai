import { ChatOpenRouter } from "@langchain/openrouter";
import { z } from "zod";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { AgentExecutionTelemetrySink, LlmRunTelemetry } from "../telemetry";
import type { GenerationStatsClient } from "./openrouter-generation-stats.client";

export type StructuredOutputData = Record<string, unknown>;

export type AgentMessageRole = "system" | "user" | "assistant";

export type AgentMessage = {
  role: AgentMessageRole;
  content: string;
};

export type StructuredOutputRunnerInput<TOutput extends StructuredOutputData> = {
  schema: z.ZodType<TOutput>;
  schemaName: string;
  messages: AgentMessage[];
};

export interface StructuredOutputRunner {
  run<TOutput extends StructuredOutputData>(input: StructuredOutputRunnerInput<TOutput>): Promise<TOutput>;
}

export type LangChainStructuredOutputRunnerOptions = {
  generationStatsClient?: GenerationStatsClient;
  modelRequested: string;
  telemetrySink?: AgentExecutionTelemetrySink;
};

export type StructuredOutputConfig = {
  includeRaw: true;
  name: string;
  strict: true;
};

export function createStructuredOutputConfig(schemaName: string): StructuredOutputConfig {
  return {
    includeRaw: true,
    name: schemaName,
    strict: true,
  };
}

const usageMetadataSchema = z.object({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
  input_token_details: z.object({
    cache_read: z.number().optional(),
  }).optional(),
});

const rawMessageSchema = z.object({
  id: z.string().optional(),
  response_metadata: z.record(z.string(), z.unknown()).optional(),
  usage_metadata: usageMetadataSchema.optional(),
}).passthrough();

const rawStructuredOutputSchema = z.object({
  parsed: z.unknown(),
  raw: rawMessageSchema,
});

export class LangChainStructuredOutputRunner implements StructuredOutputRunner {
  constructor(
    private readonly chatModel: ChatOpenRouter,
    private readonly options?: LangChainStructuredOutputRunnerOptions,
  ) {}

  async run<TOutput extends StructuredOutputData>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    try {
      const structuredModel = this.chatModel.withStructuredOutput(
        input.schema,
        createStructuredOutputConfig(input.schemaName),
      );
      const rawOutput = await structuredModel.invoke(input.messages);
      const structuredOutput = rawStructuredOutputSchema.safeParse(rawOutput);

      if (!structuredOutput.success) {
        throw new GenericError(`Saida estruturada invalida para ${input.schemaName}.`, structuredOutput.error);
      }

      const parsed = input.schema.safeParse(structuredOutput.data.parsed);

      if (!parsed.success) {
        throw new GenericError(`Saida estruturada invalida para ${input.schemaName}.`, parsed.error);
      }

      await this.recordTelemetry(structuredOutput.data.raw);

      return parsed.data;
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  private async recordTelemetry(raw: z.infer<typeof rawMessageSchema>): Promise<void> {
    if (!this.options?.telemetrySink) {
      return;
    }

    const fallback = this.extractTelemetry(raw);
    const telemetry = fallback.generationId && this.options.generationStatsClient
      ? await this.options.generationStatsClient.fetchTelemetry({
          generationId: fallback.generationId,
          modelRequested: this.options.modelRequested,
          fallback,
        })
      : fallback;

    this.options.telemetrySink.record({
      provider: "openrouter",
      modelRequested: this.options.modelRequested,
      ...telemetry,
    });
  }

  private extractTelemetry(raw: z.infer<typeof rawMessageSchema>): Partial<LlmRunTelemetry> {
    const metadata = raw.response_metadata ?? {};
    const usage = raw.usage_metadata;

    return {
      generationId: raw.id ?? readString(metadata, "id") ?? readString(metadata, "generation_id"),
      modelUsed: readString(metadata, "model_name") ?? readString(metadata, "model"),
      promptTokens: usage?.input_tokens ?? null,
      completionTokens: usage?.output_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      cacheReadTokens: usage?.input_token_details?.cache_read ?? null,
    };
  }
}

function readString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];

  return typeof value === "string" && value.trim() ? value : null;
}
