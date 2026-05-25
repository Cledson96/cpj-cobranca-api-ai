import { describe, expect, it } from "vitest";
import {
  flowTypeSchema,
  testsRequestSchema,
  testsResponseSchema,
} from "@shared";

describe("tests schemas", () => {
  it("aceita payload de geracao de testes no contrato do case", () => {
    const result = testsRequestSchema.parse({
      code: "export function charge(amount: number) { return amount > 0; }",
      language: "typescript",
      test_framework: "vitest",
      prompt_version: 5,
    });

    expect(result.test_framework).toBe("vitest");
    expect(result.prompt_version).toBe(5);
  });

  it("aceita frameworks citados no case", () => {
    const result = testsRequestSchema.parse({
      code: "def charge(amount): return amount > 0",
      language: "python",
      test_framework: "mocha",
    });

    expect(result.test_framework).toBe("mocha");
  });

  it("rejeita codigo vazio", () => {
    const result = testsRequestSchema.safeParse({
      code: "   ",
      language: "typescript",
      test_framework: "jest",
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
      test_file: [
        "import { expect, it } from 'vitest';",
        "import { charge } from './charge';",
        "",
        "it('retorna true para valor positivo', () => {",
        "  expect(charge(100)).toBe(true);",
        "});",
      ].join("\n"),
      test_cases: [
        {
          name: "retorna true para valor positivo",
          type: "happy_path",
          description: "Valida a regra principal.",
        },
      ],
      coverage_hints: ["Cobrir valores invalidos."],
    });

    expect(response.framework).toBe("vitest");
    expect(response.test_cases[0]?.type).toBe("happy_path");
    expect(response.test_file).toContain("vitest");
  });

  it("rejeita test_file que contem apenas nome de arquivo", () => {
    const result = testsResponseSchema.safeParse({
      framework: "jest",
      test_file: "parcelas.service.test.ts",
      test_cases: [
        {
          name: "calcula juros",
          type: "happy_path",
          description: "Valida calculo principal.",
        },
      ],
      coverage_hints: [],
    });

    expect(result.success).toBe(false);
  });
});
