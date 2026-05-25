import { describe, expect, it } from "vitest";
import {
  flowTypeSchema,
  reviewRequestSchema,
  reviewResponseSchema,
  supportedLanguageSchema,
} from "@shared";

describe("review schemas", () => {
  it("valida o payload de entrada do code review", () => {
    const result = reviewRequestSchema.parse({
      code: "export function soma(a: number, b: number) { return a + b; }",
      language: "typescript",
      context: "Modulo de calculo simples",
      prompt_version: 2,
    });

    expect(result).toEqual({
      code: "export function soma(a: number, b: number) { return a + b; }",
      language: "typescript",
      context: "Modulo de calculo simples",
      prompt_version: 2,
    });
  });

  it("rejeita payload de review sem codigo", () => {
    const result = reviewRequestSchema.safeParse({
      code: "",
      language: "typescript",
    });

    expect(result.success).toBe(false);
  });

  it("mantem enums iniciais do case", () => {
    expect(flowTypeSchema.parse("review")).toBe("review");
    expect(supportedLanguageSchema.parse("python")).toBe("python");
    expect(() => supportedLanguageSchema.parse("java")).toThrow();
  });

  it("valida a resposta esperada do code review", () => {
    const response = reviewResponseSchema.parse({
      overall_quality: "needs_improvement",
      score: 6,
      issues: [
        {
          severity: "high",
          line_hint: "linha 2",
          description: "Query SQL montada com interpolacao direta.",
          suggestion: "Use parametros preparados.",
        },
      ],
      positives: ["Funcao pequena e objetivo claro."],
      summary: "O codigo precisa corrigir risco de SQL injection.",
    });

    expect(response.score).toBe(6);
    expect(response.issues[0]?.severity).toBe("high");
  });
});
