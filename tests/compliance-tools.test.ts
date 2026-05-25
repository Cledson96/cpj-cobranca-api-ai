import { describe, expect, it } from "vitest";
import { DeterministicComplianceToolsRunner } from "@/modules/compliance/tools";

describe("DeterministicComplianceToolsRunner", () => {
  it("extrai requisitos candidatos da descricao da tarefa", () => {
    const runner = new DeterministicComplianceToolsRunner();

    const result = runner.run({
      task_description: [
        "- Permitir renegociacao apenas para contratos ativos",
        "- Registrar auditoria da renegociacao",
      ].join("\n"),
      code: "if (contract.active) { renegotiate(contract); }",
      language: "typescript",
    });

    expect(result.requirements).toEqual([
      {
        text: "Permitir renegociacao apenas para contratos ativos",
        line_hint: "linha 1",
      },
      {
        text: "Registrar auditoria da renegociacao",
        line_hint: "linha 2",
      },
    ]);
  });

  it("sinaliza requisito sem evidencia textual no codigo", () => {
    const runner = new DeterministicComplianceToolsRunner();

    const result = runner.run({
      task_description: [
        "- Permitir renegociacao apenas para contratos ativos",
        "- Registrar auditoria da renegociacao",
      ].join("\n"),
      code: "if (contract.active) { renegotiate(contract); }",
      language: "typescript",
    });

    expect(result.findings).toContainEqual({
      kind: "possible_missing_requirement",
      requirement: "Registrar auditoria da renegociacao",
      confidence: "low",
      description: "Nao encontrei evidencia textual simples deste requisito no codigo.",
    });
  });
});
