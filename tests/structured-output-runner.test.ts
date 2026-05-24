import { describe, expect, it } from "vitest";
import { createStructuredOutputConfig, extractOpenRouterTelemetry } from "@/modules/agent/llm";

describe("createStructuredOutputConfig", () => {
  it("deixa OpenRouter escolher metodo compativel com o modelo", () => {
    const config = createStructuredOutputConfig("ReviewAggregatorOutput");

    expect(config).toEqual({
      includeRaw: true,
      name: "ReviewAggregatorOutput",
      strict: true,
    });
    expect(config).not.toHaveProperty("method");
  });
});

describe("extractOpenRouterTelemetry", () => {
  it("extrai tokens e custos detalhados do llmOutput do OpenRouter", () => {
    const telemetry = extractOpenRouterTelemetry({
      modelRequested: "deepseek/deepseek-v4-flash",
      llmOutput: {
        tokenUsage: {
          prompt_tokens: 120,
          completion_tokens: 30,
          total_tokens: 150,
          cost: 0.00019,
          cost_details: {
            upstream_inference_prompt_cost: 0.00004,
            upstream_inference_completions_cost: 0.00015,
          },
          prompt_tokens_details: {
            cached_tokens: 12,
          },
        },
        model_name: "deepseek/deepseek-v4-flash",
      },
      raw: {
        id: "gen-1",
      },
    });

    expect(telemetry).toEqual({
      generationId: "gen-1",
      modelUsed: "deepseek/deepseek-v4-flash",
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      costUsd: 0.00019,
      inputCostUsd: 0.00004,
      outputCostUsd: 0.00015,
      cacheReadTokens: 12,
    });
  });

  it("usa response_metadata quando o llmOutput nao traz tokenUsage", () => {
    const telemetry = extractOpenRouterTelemetry({
      modelRequested: "openai/gpt-4o-mini",
      raw: {
        id: "gen-2",
        response_metadata: {
          model_name: "openai/gpt-4o-mini",
          token_usage: {
            prompt_tokens: 90,
            completion_tokens: 10,
            total_tokens: 100,
            cost: 0.00008,
            cost_details: {
              upstream_inference_prompt_cost: 0.00003,
              upstream_inference_completions_cost: 0.00005,
            },
          },
        },
      },
    });

    expect(telemetry).toMatchObject({
      generationId: "gen-2",
      modelUsed: "openai/gpt-4o-mini",
      promptTokens: 90,
      completionTokens: 10,
      totalTokens: 100,
      costUsd: 0.00008,
      inputCostUsd: 0.00003,
      outputCostUsd: 0.00005,
    });
  });
});
