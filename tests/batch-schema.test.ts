import { describe, expect, it } from "vitest";
import {
  batchRequestSchema,
  batchResponseSchema,
  flowTypeSchema,
} from "@shared";

describe("batch schemas", () => {
  it("aceita batch com itens de fluxos prontos", () => {
    const result = batchRequestSchema.parse({
      items: [
        {
          flow_type: "review",
          payload: {
            code: "function sum(a, b) { return a + b; }",
            language: "javascript",
          },
        },
        {
          flow_type: "tests",
          payload: {
            code: "export function sum(a: number, b: number) { return a + b; }",
            language: "typescript",
            framework: "vitest",
          },
        },
      ],
      continue_on_error: true,
      notify: false,
    });

    expect(result.items).toHaveLength(2);
    expect(result.continue_on_error).toBe(true);
    expect(result.notify).toBe(false);
  });

  it("define continue_on_error true e notify false por padrao", () => {
    const result = batchRequestSchema.parse({
      items: [
        {
          flow_type: "document",
          payload: {
            code: "export function charge(amount: number) { return amount > 0; }",
            language: "typescript",
          },
        },
      ],
    });

    expect(result.continue_on_error).toBe(true);
    expect(result.notify).toBe(false);
  });

  it("rejeita batch vazio", () => {
    const result = batchRequestSchema.safeParse({
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("aceita batch como flow type publico", () => {
    expect(flowTypeSchema.parse("batch")).toBe("batch");
  });

  it("valida resposta estruturada de batch", () => {
    const response = batchResponseSchema.parse({
      batch_id: "batch-1",
      status: "partial",
      results: [
        {
          index: 0,
          flow_type: "review",
          execution_id: null,
          status: "success",
          cache_hit: null,
          output: { summary: "ok" },
          error_message: null,
        },
        {
          index: 1,
          flow_type: "tests",
          execution_id: null,
          status: "failed",
          cache_hit: null,
          output: null,
          error_message: "falha no item",
        },
      ],
    });

    expect(response.status).toBe("partial");
    expect(response.results[1]?.status).toBe("failed");
  });
});
