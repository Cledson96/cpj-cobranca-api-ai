import { z } from "zod";
import type { LlmRunTelemetry } from "../telemetry";

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

const tokenUsageSchema = z.object({
  prompt_tokens: z.unknown().optional(),
  completion_tokens: z.unknown().optional(),
  total_tokens: z.unknown().optional(),
  cost: z.unknown().optional(),
  cost_details: z.record(z.string(), z.unknown()).optional(),
  costDetails: z.record(z.string(), z.unknown()).optional(),
  prompt_tokens_details: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

type TokenUsage = z.infer<typeof tokenUsageSchema>;

const recordSchema = z.record(z.string(), z.unknown());

export function extractOpenRouterTelemetry(input: {
  modelRequested: string;
  raw?: unknown;
  llmOutput?: unknown;
}): Partial<LlmRunTelemetry> {
  const raw = rawMessageSchema.safeParse(input.raw);
  const rawMessage = raw.success ? raw.data : null;
  const rawRecord = readRecord(input.raw);
  const llmOutput = readRecord(input.llmOutput);
  const metadata = rawMessage?.response_metadata
    ?? readRecordField(rawRecord, "response_metadata")
    ?? {};
  const usageMetadata = rawMessage?.usage_metadata;
  const tokenUsage = readTokenUsageFromRecord(llmOutput)
    ?? readTokenUsageFromRecord(metadata)
    ?? readTokenUsage(input.llmOutput)
    ?? null;

  return {
    generationId: rawMessage?.id
      ?? readString(metadata, "id")
      ?? readString(metadata, "generation_id")
      ?? readString(llmOutput, "id"),
    modelUsed: readString(llmOutput, "model_name")
      ?? readString(llmOutput, "model")
      ?? readString(llmOutput, "modelName")
      ?? readString(metadata, "model_name")
      ?? readString(metadata, "model")
      ?? input.modelRequested,
    promptTokens: readNumber(tokenUsage?.prompt_tokens) ?? usageMetadata?.input_tokens ?? null,
    completionTokens: readNumber(tokenUsage?.completion_tokens) ?? usageMetadata?.output_tokens ?? null,
    totalTokens: readNumber(tokenUsage?.total_tokens) ?? usageMetadata?.total_tokens ?? null,
    costUsd: readNumber(tokenUsage?.cost),
    inputCostUsd: readCostDetail(tokenUsage, "upstream_inference_prompt_cost"),
    outputCostUsd: readCostDetail(tokenUsage, "upstream_inference_completions_cost"),
    cacheReadTokens: readCacheTokens(tokenUsage) ?? usageMetadata?.input_token_details?.cache_read ?? null,
  };
}

function readRecord(input: unknown): Record<string, unknown> | null {
  const parsed = recordSchema.safeParse(input);

  return parsed.success ? parsed.data : null;
}

function readRecordField(input: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  if (!input) {
    return null;
  }

  return readRecord(input[key]);
}

function readTokenUsage(input: unknown): TokenUsage | null {
  const parsed = tokenUsageSchema.safeParse(input);

  return parsed.success ? parsed.data : null;
}

function readTokenUsageFromRecord(input: Record<string, unknown> | null): TokenUsage | null {
  if (!input) {
    return null;
  }

  return readTokenUsage(input.tokenUsage)
    ?? readTokenUsage(input.token_usage)
    ?? null;
}

function readString(input: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!input) {
    return null;
  }

  const value = input[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input === "string") {
    const parsed = Number(input);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readCostDetail(tokenUsage: TokenUsage | null, key: string): number | null {
  if (!tokenUsage) {
    return null;
  }

  const details = tokenUsage.cost_details ?? tokenUsage.costDetails;

  return readNumber(details?.[key]);
}

function readCacheTokens(tokenUsage: TokenUsage | null): number | null {
  if (!tokenUsage) {
    return null;
  }

  const details = tokenUsage.prompt_tokens_details;

  return readNumber(details?.cached_tokens);
}
