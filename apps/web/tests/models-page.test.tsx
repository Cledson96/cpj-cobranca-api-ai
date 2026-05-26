import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelsPage } from "@/features/models/models-page";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    listModels: vi.fn(),
    createModel: vi.fn(),
    updateModel: vi.fn(),
    deleteModel: vi.fn(),
  },
}));

describe("ModelsPage", () => {
  beforeEach(() => {
    vi.mocked(api.listModels).mockResolvedValue({
      items: [
        {
          id: "model-1",
          name: "openai/gpt-4o-mini",
          is_active: true,
          is_default: true,
        },
        {
          id: "model-2",
          name: "deepseek/deepseek-v4-flash",
          is_active: true,
          is_default: false,
        },
      ],
    });
    vi.mocked(api.createModel).mockResolvedValue({
      id: "model-3",
      name: "anthropic/claude-3.5-haiku",
      is_active: true,
      is_default: false,
    });
    vi.mocked(api.updateModel).mockResolvedValue({
      id: "model-2",
      name: "deepseek/deepseek-v4-flash",
      is_active: true,
      is_default: true,
    });
    vi.mocked(api.deleteModel).mockResolvedValue(undefined);
  });

  it("cadastra modelo e define modelo como padrao", async () => {
    const user = userEvent.setup();
    render(<ModelsPage />);

    await screen.findByText("openai/gpt-4o-mini");
    await user.type(screen.getByLabelText("Nome do modelo"), "anthropic/claude-3.5-haiku");
    fireEvent.click(screen.getByRole("button", { name: /cadastrar modelo/i }));

    await waitFor(() => {
      expect(api.createModel).toHaveBeenCalledWith({
        name: "anthropic/claude-3.5-haiku",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /definir deepseek\/deepseek-v4-flash como padrao/i }));

    await waitFor(() => {
      expect(api.updateModel).toHaveBeenCalledWith("model-2", {
        is_default: true,
      });
    });
  });
});
