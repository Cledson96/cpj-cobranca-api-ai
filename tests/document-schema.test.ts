import { describe, expect, it } from "vitest";
import {
  documentRequestSchema,
  documentResponseSchema,
  flowTypeSchema,
} from "@shared";

describe("document schemas", () => {
  it("aceita payload de documentacao no contrato do case", () => {
    const result = documentRequestSchema.parse({
      code: "export function charge(amount: number) { return amount > 0; }",
      language: "typescript",
      doc_type: "technical",
    });

    expect(result.doc_type).toBe("technical");
  });

  it("aceita documentacao operacional para squads e produto", () => {
    const result = documentRequestSchema.parse({
      code: "def charge(amount): return amount > 0",
      language: "python",
      doc_type: "operational",
    });

    expect(result.doc_type).toBe("operational");
  });

  it("rejeita codigo vazio", () => {
    const result = documentRequestSchema.safeParse({
      code: "   ",
      language: "typescript",
      doc_type: "technical",
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
      doc_type: "technical",
      title: "Servico de cobranca",
      description: "Valida se uma cobranca tem valor positivo.",
      inputs: [
        {
          name: "amount",
          type: "number",
          description: "Valor da cobranca.",
        },
      ],
      outputs: [
        {
          name: "return",
          type: "boolean",
          description: "Indica se o valor e positivo.",
        },
      ],
      side_effects: [],
      usage_example: "charge(100)",
      notes: "Nao foi possivel inferir persistencia.",
    });

    expect(response.doc_type).toBe("technical");
    expect(response.inputs[0]?.name).toBe("amount");
    expect(response.outputs[0]?.type).toBe("boolean");
  });
});
