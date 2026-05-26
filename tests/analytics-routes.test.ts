import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { createTestEnv } from "./support/test-env";

const usageResponse = {
  totals: {
    executions: 3,
    successful: 2,
    failed: 1,
    cache_hits: 1,
    prompt_tokens: 300,
    completion_tokens: 120,
    total_tokens: 420,
    cache_read_tokens: 30,
    cost_total_usd: 0.0034,
    cost_input_usd: 0.001,
    cost_output_usd: 0.0024,
    average_duration_ms: 1500,
  },
  by_day: [
    {
      date: "2026-05-25",
      executions: 3,
      total_tokens: 420,
      cost_total_usd: 0.0034,
    },
  ],
  by_flow: [
    {
      flow_type: "review",
      executions: 2,
      total_tokens: 320,
      cost_total_usd: 0.0024,
    },
    {
      flow_type: "tests",
      executions: 1,
      total_tokens: 100,
      cost_total_usd: 0.001,
    },
  ],
  by_model: [
    {
      model: "openai/gpt-4o-mini",
      executions: 3,
      total_tokens: 420,
      cost_total_usd: 0.0034,
    },
  ],
};

function createApp(analyticsService: unknown) {
  return buildApp({
    env: createTestEnv(),
    registerDatabase: false,
    serverOptions: { logger: false },
    dependencies: { analyticsService } as never,
  });
}

describe("AnalyticsRoutes", () => {
  it("retorna uso agregado com filtros", async () => {
    const analyticsService = {
      getUsage: vi.fn().mockResolvedValue(usageResponse),
    };
    const app = createApp(analyticsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/usage?flow_type=review&model=openai%2Fgpt-4o-mini&from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-31T23%3A59%3A59.000Z",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(usageResponse);
    expect(analyticsService.getUsage).toHaveBeenCalledWith({
      flow_type: "review",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });

    await app.close();
  });

  it("retorna 400 para query invalida de analytics", async () => {
    const analyticsService = {
      getUsage: vi.fn(),
    };
    const app = createApp(analyticsService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/usage?flow_type=unknown",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Query invalida para analytics.",
    });
    expect(analyticsService.getUsage).not.toHaveBeenCalled();

    await app.close();
  });
});
