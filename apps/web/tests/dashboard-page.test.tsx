import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/features/dashboard/dashboard-page";

vi.mock("@/lib/api-client", () => ({
  api: {
    getUsage: vi.fn().mockResolvedValue({
      totals: {
        executions: 12,
        successful: 10,
        failed: 2,
        cache_hits: 3,
        prompt_tokens: 1200,
        completion_tokens: 640,
        total_tokens: 1840,
        cache_read_tokens: 100,
        cost_total_usd: 0.0184,
        cost_input_usd: 0.006,
        cost_output_usd: 0.0124,
        average_duration_ms: 1450,
      },
      by_day: [
        {
          date: "2026-05-25",
          executions: 12,
          total_tokens: 1840,
          cost_total_usd: 0.0184,
        },
      ],
      by_flow: [
        {
          flow_type: "review",
          executions: 8,
          total_tokens: 1300,
          cost_total_usd: 0.013,
        },
      ],
      by_model: [
        {
          model: "openai/gpt-4o-mini",
          executions: 12,
          total_tokens: 1840,
          cost_total_usd: 0.0184,
        },
      ],
    }),
  },
}));

describe("DashboardPage", () => {
  it("renderiza KPIs de execucoes, tokens e custo", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Execucoes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.840").length).toBeGreaterThan(0);
    expect(screen.getAllByText("US$ 0.0184").length).toBeGreaterThan(0);
    expect(screen.getAllByText("review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("openai/gpt-4o-mini").length).toBeGreaterThan(0);
  });
});
