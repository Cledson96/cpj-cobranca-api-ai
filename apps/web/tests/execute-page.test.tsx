import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecutePage } from "@/features/execute/execute-page";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    runReview: vi.fn().mockResolvedValue({
      overall_quality: "good",
      score: 9,
      issues: [],
      positives: ["Codigo simples."],
      summary: "Sem problemas relevantes.",
    }),
    runCompliance: vi.fn(),
    runDocument: vi.fn(),
    runTests: vi.fn(),
    runPullRequestReview: vi.fn(),
    runPullRequestTests: vi.fn(),
    runBatch: vi.fn(),
  },
}));

describe("ExecutePage", () => {
  it("executa review com formulario guiado", async () => {
    render(<ExecutePage />);

    fireEvent.change(screen.getByLabelText("Codigo"), {
      target: {
        value: "function sum(a, b) { return a + b; }",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /executar review/i }));

    await waitFor(() => {
      expect(api.runReview).toHaveBeenCalledWith({
        code: "function sum(a, b) { return a + b; }",
        language: "typescript",
      });
    });
    expect(await screen.findByText(/sem problemas relevantes/i)).toBeInTheDocument();
  });
});
