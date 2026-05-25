import { describe, expect, it } from "vitest";
import {
  documentRequestSchema,
  documentResponseSchema,
  flowTypeSchema,
} from "@shared";

describe("document schemas", () => {
  it("aceita payload de documentacao com opcoes editoriais", () => {
    const result = documentRequestSchema.parse({
      code: "export function charge(amount: number) { return amount > 0; }",
      language: "typescript",
      title: "Servico de cobranca",
      audience: "developer",
      detail_level: "detailed",
    });

    expect(result.title).toBe("Servico de cobranca");
    expect(result.audience).toBe("developer");
    expect(result.detail_level).toBe("detailed");
  });

  it("define valores padrao para audiencia e nivel de detalhe", () => {
    const result = documentRequestSchema.parse({
      code: "def charge(amount): return amount > 0",
      language: "python",
    });

    expect(result.audience).toBe("developer");
    expect(result.detail_level).toBe("standard");
  });

  it("rejeita codigo vazio", () => {
    const result = documentRequestSchema.safeParse({
      code: "   ",
      language: "typescript",
    });

    expect(result.success).toBe(false);
  });

  it("aceita document como flow type sem remover fluxos existentes", () => {
    expect(flowTypeSchema.parse("review")).toBe("review");
    expect(flowTypeSchema.parse("compliance")).toBe("compliance");
    expect(flowTypeSchema.parse("document")).toBe("document");
  });

  it("valida resposta estruturada de documentacao", () => {
    const response = documentResponseSchema.parse({
      title: "Servico de cobranca",
      summary: "Documenta a regra principal de cobranca.",
      documentation: "## Servico de cobranca\n\nUse `charge` para validar cobrancas.",
      public_api: [
        {
          name: "charge",
          kind: "function",
          description: "Valida se uma cobranca tem valor positivo.",
        },
      ],
      examples: ["charge(100)"],
      gaps: ["Nao foi possivel inferir persistencia."],
    });

    expect(response.public_api[0]?.name).toBe("charge");
    expect(response.documentation).toContain("Servico de cobranca");
  });
});
