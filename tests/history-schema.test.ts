import { describe, expect, it } from "vitest";
import { historyListQuerySchema, historyListResponseSchema } from "@shared";

describe("history schemas", () => {
  it("coerce filtros de historico vindos da query string", () => {
    const result = historyListQuerySchema.parse({
      limit: "10",
      cursor: "execution-1",
      flow_type: "review",
      status: "success",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
      cache_hit: "false",
    });

    expect(result).toEqual({
      limit: 10,
      cursor: "execution-1",
      flow_type: "review",
      status: "success",
      model: "openai/gpt-4o-mini",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
      cache_hit: false,
    });
  });

  it("valida resposta paginada de historico", () => {
    const result = historyListResponseSchema.parse({
      items: [],
      page: {
        limit: 20,
        next_cursor: null,
      },
    });

    expect(result.page).toEqual({
      limit: 20,
      next_cursor: null,
    });
  });
});
