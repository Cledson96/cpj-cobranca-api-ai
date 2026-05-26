import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { HistoryService } from "@/modules/history";
import { createTestEnv } from "./support/test-env";

const historyItem = {
  id: "execution-1",
  type: "review",
  status: "success",
  timestamp: "2026-05-24T12:30:45-03:00",
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
    cost_total_usd: 0.0001,
    cost_input_usd: 0.00003,
    cost_output_usd: 0.00007,
    cache_read_tokens: 4,
  },
  steps: [
    {
      node_name: "language_router",
      kind: "system",
      status: "success",
      duration_ms: 1,
    },
    {
      node_name: "security_agent",
      kind: "llm",
      status: "success",
      duration_ms: 200,
    },
  ],
};

const historyDetail = {
  ...historyItem,
  input_payload: {
    code: "export function soma(a: number, b: number) { return a + b; }",
    language: "typescript",
  },
  output_payload: {
    overall_quality: "good",
    score: 9,
    issues: [],
    positives: ["Codigo simples."],
    summary: "Sem problemas relevantes.",
  },
  error_message: null,
  steps: [
    {
      id: "step-1",
      timestamp: "2026-05-24T12:30:45-03:00",
      node_name: "security_agent",
      kind: "llm",
      status: "success",
      duration_ms: 200,
      input_payload: { language: "typescript" },
      output_payload: { findings: [] },
      error_message: null,
    },
  ],
};

function createApp(historyService: HistoryService) {
  return buildApp({
    env: createTestEnv(),
    registerDatabase: false,
    serverOptions: { logger: false },
    dependencies: { historyService },
  });
}

describe("HistoryRoutes", () => {
  it("lista as ultimas execucoes", async () => {
      const historyService: HistoryService = {
        listLatest: vi.fn().mockResolvedValue({
          items: [historyItem],
          page: {
            limit: 20,
            next_cursor: null,
          },
        }),
        findById: vi.fn(),
      };
    const app = createApp(historyService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [historyItem],
      page: {
        limit: 20,
        next_cursor: null,
      },
    });
    expect(historyService.listLatest).toHaveBeenCalledWith({
      limit: 20,
    });

    await app.close();
  });

  it("lista execucoes com filtros e paginacao por cursor", async () => {
    const historyService: HistoryService = {
      listLatest: vi.fn().mockResolvedValue({
        items: [historyItem],
        page: {
          limit: 10,
          next_cursor: "execution-1",
        },
      }),
      findById: vi.fn(),
    };
    const app = createApp(historyService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history?limit=10&cursor=execution-0&flow_type=review&status=success&model=openai%2Fgpt-4o-mini&from=2026-05-01T00%3A00%3A00.000Z&to=2026-05-31T23%3A59%3A59.000Z&cache_hit=false",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [historyItem],
      page: {
        limit: 10,
        next_cursor: "execution-1",
      },
    });
    expect(historyService.listLatest).toHaveBeenCalledWith({
      limit: 10,
      cursor: "execution-0",
      flow_type: "review",
      status: "success",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
      cache_hit: false,
    });

    await app.close();
  });

  it("retorna 400 para query invalida de historico", async () => {
    const historyService: HistoryService = {
      listLatest: vi.fn(),
      findById: vi.fn(),
    };
    const app = createApp(historyService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history?limit=0&flow_type=unknown",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Query invalida para historico.",
    });
    expect(historyService.listLatest).not.toHaveBeenCalled();

    await app.close();
  });

  it("busca detalhe da execucao por id", async () => {
    const historyService: HistoryService = {
      listLatest: vi.fn(),
      findById: vi.fn().mockResolvedValue(historyDetail),
    };
    const app = createApp(historyService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history/execution-1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(historyDetail);
    expect(historyService.findById).toHaveBeenCalledWith("execution-1");

    await app.close();
  });

  it("retorna 404 quando execucao nao existe", async () => {
    const historyService: HistoryService = {
      listLatest: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
    };
    const app = createApp(historyService);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history/inexistente",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "not_found",
      message: "Execucao nao encontrada.",
    });

    await app.close();
  });
});
