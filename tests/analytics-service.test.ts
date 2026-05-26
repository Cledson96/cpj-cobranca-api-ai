import { describe, expect, it, vi } from "vitest";
import { DefaultAnalyticsService } from "@/modules/analytics";

describe("DefaultAnalyticsService", () => {
  it("agrega uso por totais, dia, fluxo e modelo", async () => {
    const repository = {
      listUsageRecords: vi.fn().mockResolvedValue([
        {
          id: "execution-1",
          createdAt: new Date("2026-05-25T12:00:00.000Z"),
          flowType: "review",
          status: "success",
          durationMs: 1000,
          cacheHit: false,
          telemetry: {
            modelRequested: "openai/gpt-4o-mini",
            promptTokens: 100,
            completionTokens: 40,
            totalTokens: 140,
            costUsd: "0.0014",
            inputCostUsd: "0.0004",
            outputCostUsd: "0.001",
            cacheReadTokens: 0,
          },
        },
        {
          id: "execution-2",
          createdAt: new Date("2026-05-25T13:00:00.000Z"),
          flowType: "review",
          status: "failed",
          durationMs: 2000,
          cacheHit: true,
          telemetry: {
            modelRequested: "openai/gpt-4o-mini",
            promptTokens: 80,
            completionTokens: 20,
            totalTokens: 100,
            costUsd: "0.001",
            inputCostUsd: "0.0003",
            outputCostUsd: "0.0007",
            cacheReadTokens: 25,
          },
        },
        {
          id: "execution-3",
          createdAt: new Date("2026-05-26T10:00:00.000Z"),
          flowType: "tests",
          status: "success",
          durationMs: 3000,
          cacheHit: false,
          telemetry: {
            modelRequested: "deepseek/deepseek-v4-flash",
            promptTokens: 120,
            completionTokens: 60,
            totalTokens: 180,
            costUsd: "0.0018",
            inputCostUsd: "0.0006",
            outputCostUsd: "0.0012",
            cacheReadTokens: 5,
          },
        },
      ]),
    };
    const service = new DefaultAnalyticsService(repository);

    const output = await service.getUsage({
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });

    expect(output).toEqual({
      totals: {
        executions: 3,
        successful: 2,
        failed: 1,
        cache_hits: 1,
        prompt_tokens: 300,
        completion_tokens: 120,
        total_tokens: 420,
        cache_read_tokens: 30,
        cost_total_usd: 0.0042,
        cost_input_usd: 0.0013,
        cost_output_usd: 0.0029,
        average_duration_ms: 2000,
      },
      by_day: [
        {
          date: "2026-05-25",
          executions: 2,
          total_tokens: 240,
          cost_total_usd: 0.0024,
        },
        {
          date: "2026-05-26",
          executions: 1,
          total_tokens: 180,
          cost_total_usd: 0.0018,
        },
      ],
      by_flow: [
        {
          flow_type: "review",
          executions: 2,
          total_tokens: 240,
          cost_total_usd: 0.0024,
        },
        {
          flow_type: "tests",
          executions: 1,
          total_tokens: 180,
          cost_total_usd: 0.0018,
        },
      ],
      by_model: [
        {
          model: "deepseek/deepseek-v4-flash",
          executions: 1,
          total_tokens: 180,
          cost_total_usd: 0.0018,
        },
        {
          model: "openai/gpt-4o-mini",
          executions: 2,
          total_tokens: 240,
          cost_total_usd: 0.0024,
        },
      ],
    });
    expect(repository.listUsageRecords).toHaveBeenCalledWith({
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });
  });
});
