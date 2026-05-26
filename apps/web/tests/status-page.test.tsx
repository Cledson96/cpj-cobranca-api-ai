import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusPage } from "@/features/status/status-page";

describe("StatusPage", () => {
  it("mostra health check e links da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    }));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Operacional")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /abrir swagger/i })).toHaveAttribute(
      "href",
      "http://localhost:3000/docs",
    );
  });
});
