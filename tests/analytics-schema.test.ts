import { describe, expect, it } from "vitest";
import { analyticsUsageQuerySchema, analyticsUsageResponseSchema } from "@shared";

describe("analytics schemas", () => {
  it("valida filtros de uso", () => {
    const result = analyticsUsageQuerySchema.parse({
      flow_type: "review",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });

    expect(result).toEqual({
      flow_type: "review",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });
  });

  it("valida resposta agregada de uso", () => {
    const result = analyticsUsageResponseSchema.parse({
      totals: {
        executions: 1,
        successful: 1,
        failed: 0,
        cache_hits: 0,
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        cache_read_tokens: 0,
        cost_total_usd: 0.00012,
        cost_input_usd: 0.00003,
        cost_output_usd: 0.00009,
        average_duration_ms: 800,
      },
      by_day: [
        {
          date: "2026-05-25",
          executions: 1,
          total_tokens: 120,
          cost_total_usd: 0.00012,
        },
      ],
      by_flow: [
        {
          flow_type: "review",
          executions: 1,
          total_tokens: 120,
          cost_total_usd: 0.00012,
        },
      ],
      by_model: [
        {
          model: "openai/gpt-4o-mini",
          executions: 1,
          total_tokens: 120,
          cost_total_usd: 0.00012,
        },
      ],
    });

    expect(result.totals.total_tokens).toBe(120);
    expect(result.by_day[0]?.date).toBe("2026-05-25");
  });
});
