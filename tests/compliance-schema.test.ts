import { describe, expect, it } from "vitest";
import {
  complianceRequestSchema,
  complianceResponseSchema,
  flowTypeSchema,
} from "@shared";

describe("compliance schemas", () => {
  it("valida o payload de entrada da avaliacao de aderencia", () => {
    const result = complianceRequestSchema.parse({
      task_description: "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
      code: "if (contract.active) { renegotiate(contract); audit(contract.id); }",
      language: "typescript",
    });

    expect(result).toEqual({
      task_description: "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
      code: "if (contract.active) { renegotiate(contract); audit(contract.id); }",
      language: "typescript",
    });
  });

  it("rejeita payload sem descricao da tarefa", () => {
    const result = complianceRequestSchema.safeParse({
      task_description: "",
      code: "renegotiate(contract);",
      language: "typescript",
    });

    expect(result.success).toBe(false);
  });

  it("aceita compliance como flow type sem remover review", () => {
    expect(flowTypeSchema.parse("review")).toBe("review");
    expect(flowTypeSchema.parse("compliance")).toBe("compliance");
  });

  it("valida a resposta esperada da avaliacao de aderencia", () => {
    const response = complianceResponseSchema.parse({
      compliant: false,
      compliance_score: 65,
      covered_requirements: ["Valida contrato ativo antes da renegociacao."],
      missing_requirements: ["Nao registra auditoria da renegociacao."],
      partial_requirements: ["Trata apenas um tipo de status de contrato."],
      verdict: "A implementacao cobre a regra principal, mas deixa auditoria obrigatoria sem garantia.",
    });

    expect(response.compliant).toBe(false);
    expect(response.compliance_score).toBe(65);
    expect(response.missing_requirements).toContain("Nao registra auditoria da renegociacao.");
  });

  it("rejeita compliance_score fora do intervalo 0 a 100", () => {
    const result = complianceResponseSchema.safeParse({
      compliant: true,
      compliance_score: 101,
      covered_requirements: ["Todos os requisitos foram cobertos."],
      missing_requirements: [],
      partial_requirements: [],
      verdict: "Aderente.",
    });

    expect(result.success).toBe(false);
  });
});
