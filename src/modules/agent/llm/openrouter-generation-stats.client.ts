import { z } from "zod";
import type { AppEnv } from "@shared";
import { roundUsd, type LlmRunTelemetry } from "../telemetry";

const generationDataSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  native_tokens_cached: z.number().nullable().optional(),
  native_tokens_completion: z.number().nullable().optional(),
  native_tokens_prompt: z.number().nullable().optional(),
  tokens_completion: z.number().nullable().optional(),
  tokens_prompt: z.number().nullable().optional(),
  total_cost: z.number().nullable().optional(),
});

const generationResponseSchema = z.object({
  data: generationDataSchema,
});

const modelPricingSchema = z.object({
  prompt: z.string().optional(),
  completion: z.string().optional(),
});

const modelItemSchema = z.object({
  id: z.string(),
  canonical_slug: z.string().optional(),
  pricing: modelPricingSchema.optional(),
});

const modelsResponseSchema = z.object({
  data: z.array(modelItemSchema),
});

type ModelPricing = {
  prompt: number | null;
  completion: number | null;
};

export interface GenerationStatsClient {
  fetchTelemetry(input: {
    generationId: string;
    modelRequested: string;
    fallback: Partial<LlmRunTelemetry>;
  }): Promise<Partial<LlmRunTelemetry>>;
}

export class OpenRouterGenerationStatsClient implements GenerationStatsClient {
  private readonly pricingByModel = new Map<string, ModelPricing | null>();

  private constructor(
    private readonly input: {
      apiKey: string;
      enabled: boolean;
      baseUrl?: string;
    },
  ) {}

  static createFromEnv(env: AppEnv): OpenRouterGenerationStatsClient {
    return new OpenRouterGenerationStatsClient({
      apiKey: env.OPENROUTER_API_KEY,
      enabled: env.OPENROUTER_FETCH_GENERATION_STATS,
    });
  }

  async fetchTelemetry(input: {
    generationId: string;
    modelRequested: string;
    fallback: Partial<LlmRunTelemetry>;
  }): Promise<Partial<LlmRunTelemetry>> {
    if (!this.input.enabled || !this.input.apiKey) {
      return input.fallback;
    }

    const response = await fetch(`${this.baseUrl()}/generation?id=${encodeURIComponent(input.generationId)}`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      return input.fallback;
    }

    const parsed = generationResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return input.fallback;
    }

    const data = parsed.data.data;
    const promptTokens = data.native_tokens_prompt ?? data.tokens_prompt ?? input.fallback.promptTokens ?? null;
    const completionTokens = data.native_tokens_completion ?? data.tokens_completion ?? input.fallback.completionTokens ?? null;
    const totalTokens = sumNullable(promptTokens, completionTokens) ?? input.fallback.totalTokens ?? null;
    const modelUsed = data.model ?? input.fallback.modelUsed ?? input.modelRequested;
    const totalCost = data.total_cost ?? input.fallback.costUsd ?? null;
    const splitCost = await this.calculateSplitCost({
      model: modelUsed,
      promptTokens,
      completionTokens,
    });

    return {
      ...input.fallback,
      modelUsed,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: totalCost,
      inputCostUsd: splitCost.inputCostUsd,
      outputCostUsd: splitCost.outputCostUsd,
      cacheReadTokens: data.native_tokens_cached ?? input.fallback.cacheReadTokens ?? null,
    };
  }

  private async calculateSplitCost(input: {
    model: string;
    promptTokens: number | null;
    completionTokens: number | null;
  }): Promise<{
    inputCostUsd: number | null;
    outputCostUsd: number | null;
  }> {
    const pricing = await this.findPricing(input.model);

    return {
      inputCostUsd: multiplyPrice(input.promptTokens, pricing?.prompt ?? null),
      outputCostUsd: multiplyPrice(input.completionTokens, pricing?.completion ?? null),
    };
  }

  private async findPricing(model: string): Promise<ModelPricing | null> {
    if (this.pricingByModel.has(model)) {
      return this.pricingByModel.get(model) ?? null;
    }

    const response = await fetch(`${this.baseUrl()}/models`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      this.pricingByModel.set(model, null);
      return null;
    }

    const parsed = modelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      this.pricingByModel.set(model, null);
      return null;
    }

    const found = parsed.data.data.find((item) => item.id === model || item.canonical_slug === model);
    const pricing = found?.pricing
      ? {
          prompt: toNullableNumber(found.pricing.prompt),
          completion: toNullableNumber(found.pricing.completion),
        }
      : null;

    this.pricingByModel.set(model, pricing);

    return pricing;
  }

  private baseUrl(): string {
    return this.input.baseUrl ?? "https://openrouter.ai/api/v1";
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.input.apiKey}`,
    };
  }
}

function multiplyPrice(tokens: number | null, price: number | null): number | null {
  if (tokens === null || price === null) {
    return null;
  }

  return roundUsd(tokens * price);
}

function sumNullable(left: number | null, right: number | null): number | null {
  if (left === null && right === null) {
    return null;
  }

  return (left ?? 0) + (right ?? 0);
}

function toNullableNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
