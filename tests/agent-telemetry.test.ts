import { describe, expect, it } from "vitest";
import { AgentTelemetryCollector } from "@/modules/agent";

describe("AgentTelemetryCollector", () => {
  it("agrega tokens, custos e modelos das chamadas de llm", () => {
    const collector = new AgentTelemetryCollector();

    collector.record({
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      modelUsed: "openai/gpt-4o-mini",
      generationId: "gen-1",
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      costUsd: 0.0001,
      inputCostUsd: 0.00003,
      outputCostUsd: 0.00007,
      cacheReadTokens: 10,
    });
    collector.record({
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      modelUsed: "openai/gpt-4o-mini",
      generationId: "gen-2",
      promptTokens: 50,
      completionTokens: 30,
      totalTokens: 80,
      costUsd: 0.0002,
      inputCostUsd: 0.00004,
      outputCostUsd: 0.00016,
      cacheReadTokens: 0,
    });

    expect(collector.snapshot()).toEqual({
      provider: "openrouter",
      modelRequested: "openai/gpt-4o-mini",
      modelUsed: "openai/gpt-4o-mini",
      generationIds: ["gen-1", "gen-2"],
      promptTokens: 150,
      completionTokens: 50,
      totalTokens: 200,
      costUsd: 0.0003,
      inputCostUsd: 0.00007,
      outputCostUsd: 0.00023,
      cacheReadTokens: 10,
    });
  });
});
