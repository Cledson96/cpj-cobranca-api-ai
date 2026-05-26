import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "@/features/history/history-page";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    listHistory: vi.fn(),
    getHistoryDetail: vi.fn().mockResolvedValue({
      id: "execution-1",
      type: "review",
      status: "success",
      timestamp: "2026-05-25T12:00:00-03:00",
      duration_ms: 1200,
      cache_hit: false,
      source_execution_id: null,
      telemetry: null,
      input_payload: { code: "const a = 1;" },
      output_payload: { summary: "ok" },
      error_message: null,
      steps: [],
    }),
  },
}));

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.mocked(api.listHistory).mockResolvedValue({
      items: [
        {
          id: "execution-1",
          type: "review",
          status: "success",
          timestamp: "2026-05-25T12:00:00-03:00",
          duration_ms: 1200,
          cache_hit: false,
          source_execution_id: null,
          telemetry: {
            provider: "openrouter",
            model_requested: "openai/gpt-4o-mini",
            model_used: "openai/gpt-4o-mini",
            openrouter_generation_id: "gen-1",
            prompt_tokens: 100,
            completion_tokens: 20,
            total_tokens: 120,
            cost_total_usd: 0.0012,
            cost_input_usd: 0.0004,
            cost_output_usd: 0.0008,
            cache_read_tokens: 0,
          },
          steps: [],
        },
      ],
      page: {
        limit: 20,
        next_cursor: null,
      },
    });
  });

  it("envia filtros ao listar historico", async () => {
    render(<HistoryPage />);

    await screen.findByText("execution-1");
    fireEvent.mouseDown(screen.getByLabelText("Fluxo"));
    fireEvent.click(await screen.findByTitle("review"));
    fireEvent.mouseDown(screen.getByLabelText("Status"));
    fireEvent.click(await screen.findByTitle("success"));
    fireEvent.click(screen.getByRole("button", { name: /aplicar filtros/i }));

    await waitFor(() => {
      expect(api.listHistory).toHaveBeenLastCalledWith(expect.objectContaining({
        flow_type: "review",
        status: "success",
        limit: 20,
      }));
    });
  });
});
