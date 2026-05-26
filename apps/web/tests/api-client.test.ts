import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  buildQueryString,
  getApiBaseUrl,
  type PromptCreatePayload,
} from "@/lib/api-client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("api-client", () => {
  it("usa localhost:3000 como base padrao da API", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    expect(getApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("monta query string ignorando valores vazios", () => {
    expect(buildQueryString({
      limit: 20,
      cursor: "",
      status: "success",
      cache_hit: false,
      model: undefined,
    })).toBe("?limit=20&status=success&cache_hit=false");
  });

  it("busca analytics de uso com filtros", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.local");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totals: { executions: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.getUsage({
      flow_type: "review",
      model: "openai/gpt-4o-mini",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/v1/analytics/usage?flow_type=review&model=openai%2Fgpt-4o-mini",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      }),
    );
  });

  it("envia payload JSON ao criar prompt", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.local");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 2 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      flow_type: "document",
      name: "Document v2",
      blocks: [
        {
          block_key: "agent",
          system_prompt: "Voce documenta codigo.",
        },
      ],
    } satisfies PromptCreatePayload;

    await api.createPrompt(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/v1/prompts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
