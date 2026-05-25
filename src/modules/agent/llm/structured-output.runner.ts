import { ChatOpenRouter } from "@langchain/openrouter";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { z } from "zod";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { AgentExecutionTelemetrySink } from "../telemetry";
import type { GenerationStatsClient } from "./openrouter-generation-stats.client";
import { OpenRouterTelemetryCallback } from "./openrouter-telemetry.callback";
import { extractOpenRouterTelemetry } from "./openrouter-telemetry.extractor";

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

export type OpenRouterStructuredOutputSchema = Record<string, unknown>;

export function createOpenRouterStructuredOutputSchema(schema: z.ZodType): OpenRouterStructuredOutputSchema {
  const jsonSchema = cloneJsonSchema(toJsonSchema(schema));
  return dereferenceJsonSchema(jsonSchema, jsonSchema);
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
        createOpenRouterStructuredOutputSchema(input.schema),
        createStructuredOutputConfig(input.schemaName),
      );
      const telemetryCallback = new OpenRouterTelemetryCallback();
      const rawOutput = await structuredModel.invoke(input.messages, {
        callbacks: [telemetryCallback],
      });
      const structuredOutput = rawStructuredOutputSchema.safeParse(rawOutput);

      if (!structuredOutput.success) {
        throw new GenericError(`Saida estruturada invalida para ${input.schemaName}.`, structuredOutput.error);
      }

      const parsed = input.schema.safeParse(structuredOutput.data.parsed);

      if (!parsed.success) {
        throw new GenericError(`Saida estruturada invalida para ${input.schemaName}.`, parsed.error);
      }

      await this.recordTelemetry({
        raw: structuredOutput.data.raw,
        llmOutput: telemetryCallback.llmOutput(),
      });

      return parsed.data;
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  private async recordTelemetry(input: {
    raw: z.infer<typeof rawMessageSchema>;
    llmOutput: unknown;
  }): Promise<void> {
    if (!this.options?.telemetrySink) {
      return;
    }

    const fallback = extractOpenRouterTelemetry({
      modelRequested: this.options.modelRequested,
      raw: input.raw,
      llmOutput: input.llmOutput,
    });
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
}

function cloneJsonSchema(schema: unknown): OpenRouterStructuredOutputSchema {
  return JSON.parse(JSON.stringify(schema)) as OpenRouterStructuredOutputSchema;
}

function dereferenceJsonSchema(
  node: unknown,
  root: OpenRouterStructuredOutputSchema,
  seenRefs: Set<string> = new Set(),
): OpenRouterStructuredOutputSchema {
  if (Array.isArray(node)) {
    return node.map((item) => dereferenceJsonSchema(item, root, seenRefs)) as unknown as OpenRouterStructuredOutputSchema;
  }

  if (!node || typeof node !== "object") {
    return node as OpenRouterStructuredOutputSchema;
  }

  const record = node as Record<string, unknown>;
  const ref = record.$ref;

  if (typeof ref === "string") {
    if (seenRefs.has(ref)) {
      return {};
    }

    const target = findJsonSchemaRef(root, ref);
    const siblings = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "$ref"));
    const resolved = target
      ? dereferenceJsonSchema(target, root, new Set([...seenRefs, ref]))
      : {};

    return dereferenceJsonSchema({
      ...resolved,
      ...siblings,
    }, root, seenRefs);
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, dereferenceJsonSchema(value, root, seenRefs)]),
  );
}

function findJsonSchemaRef(root: OpenRouterStructuredOutputSchema, ref: string): unknown {
  if (!ref.startsWith("#/")) {
    return null;
  }

  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") {
        return null;
      }

      return (current as Record<string, unknown>)[part] ?? null;
    }, root);
}
