import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptsPage } from "@/features/prompts/prompts-page";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    listPrompts: vi.fn(),
    getActivePrompt: vi.fn(),
    createPrompt: vi.fn(),
    activatePrompt: vi.fn(),
  },
}));

describe("PromptsPage", () => {
  beforeEach(() => {
    vi.mocked(api.listPrompts).mockResolvedValue({
      items: [
        {
          flow_type: "document",
          version: 1,
          name: "Document v1",
          is_active: true,
          block_keys: ["agent"],
        },
      ],
    });
    vi.mocked(api.getActivePrompt).mockResolvedValue({
      flow_type: "document",
      version: 1,
      name: "Document v1",
      is_active: true,
      block_keys: ["agent"],
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Voce documenta codigo.",
        },
      ],
    });
    vi.mocked(api.createPrompt).mockResolvedValue({
      flow_type: "document",
      version: 2,
      name: "Document v2",
      is_active: false,
      block_keys: ["agent"],
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Novo prompt.",
        },
      ],
    });
    vi.mocked(api.activatePrompt).mockResolvedValue({
      flow_type: "document",
      version: 2,
      name: "Document v2",
      is_active: true,
      block_keys: ["agent"],
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Novo prompt.",
        },
      ],
    });
  });

  it("cria e ativa uma versao de prompt", async () => {
    const user = userEvent.setup();
    render(<PromptsPage />);

    expect((await screen.findAllByText("Document v1")).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText("Nome da versao"), "Document v2");
    await user.clear(screen.getByLabelText("Prompt do bloco agent"));
    await user.type(screen.getByLabelText("Prompt do bloco agent"), "Novo prompt.");
    fireEvent.click(screen.getByRole("button", { name: /criar versao/i }));

    await waitFor(() => {
      expect(api.createPrompt).toHaveBeenCalledWith({
        flow_type: "document",
        name: "Document v2",
        blocks: [
          {
            block_key: "agent",
            system_prompt: "Novo prompt.",
          },
        ],
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /ativar v1/i }));

    await waitFor(() => {
      expect(api.activatePrompt).toHaveBeenCalledWith("document", 1);
    });
  });
});
