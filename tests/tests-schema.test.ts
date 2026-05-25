import { describe, expect, it } from "vitest";
import {
  flowTypeSchema,
  testsRequestSchema,
  testsResponseSchema,
} from "@shared";

describe("tests schemas", () => {
  it("aceita payload de geracao de testes com opcoes", () => {
    const result = testsRequestSchema.parse({
      code: "export function charge(amount: number) { return amount > 0; }",
      language: "typescript",
      framework: "vitest",
      test_goal: "Cobrir valor positivo e negativo.",
      include_mocks: false,
    });

    expect(result.framework).toBe("vitest");
    expect(result.include_mocks).toBe(false);
  });

  it("define framework auto e mocks habilitados por padrao", () => {
    const result = testsRequestSchema.parse({
      code: "def charge(amount): return amount > 0",
      language: "python",
    });

    expect(result.framework).toBe("auto");
    expect(result.include_mocks).toBe(true);
  });

  it("rejeita codigo vazio", () => {
    const result = testsRequestSchema.safeParse({
      code: "   ",
      language: "typescript",
    });

    expect(result.success).toBe(false);
  });

  it("aceita tests como flow type sem remover fluxos existentes", () => {
    expect(flowTypeSchema.parse("review")).toBe("review");
    expect(flowTypeSchema.parse("compliance")).toBe("compliance");
    expect(flowTypeSchema.parse("document")).toBe("document");
    expect(flowTypeSchema.parse("tests")).toBe("tests");
  });

  it("valida resposta estruturada de geracao de testes", () => {
    const response = testsResponseSchema.parse({
      framework: "vitest",
      strategy_summary: "Cobrir caminho feliz, erro de valor invalido e contrato publico.",
      test_cases: [
        {
          name: "retorna true para valor positivo",
          kind: "unit",
          description: "Valida a regra principal.",
          assertions: ["espera true quando amount > 0"],
        },
      ],
      test_code: "import { expect, it } from 'vitest';",
      gaps: ["Nao foi possivel inferir dependencias externas."],
    });

    expect(response.framework).toBe("vitest");
    expect(response.test_cases[0]?.kind).toBe("unit");
  });
});
