import { describe, expect, it } from "vitest";
import type { ComplianceRequest, ComplianceResponse } from "@shared";
import type { ComplianceAgentLike, ComplianceAnalysisContext } from "@/modules/compliance/models";
import { ComplianceFlowGraph } from "@/modules/compliance/graphs";

const complianceInput: ComplianceRequest = {
  task_description: "- Permitir renegociacao apenas para contratos ativos\n- Registrar auditoria da renegociacao",
  code: "if (contract.active) { renegotiate(contract); }",
  language: "typescript",
};

const complianceOutput: ComplianceResponse = {
  compliant: false,
  compliance_score: 70,
  covered_requirements: ["Valida contrato ativo antes da renegociacao."],
  missing_requirements: ["Nao registra auditoria da renegociacao."],
  partial_requirements: [],
  verdict: "Parcialmente aderente.",
};

class FakeComplianceAgent implements ComplianceAgentLike {
  lastContext?: ComplianceAnalysisContext;

  async analyze(context: ComplianceAnalysisContext): Promise<ComplianceResponse> {
    this.lastContext = context;
    return complianceOutput;
  }
}

describe("ComplianceFlowGraph", () => {
  it("executa tools, chama agente de compliance e registra steps", async () => {
    const agent = new FakeComplianceAgent();
    const steps: unknown[] = [];
    const graph = new ComplianceFlowGraph({ complianceAgent: agent });

    const output = await graph.invoke(complianceInput, {
      executionId: "execution-1",
      stepRecorder: {
        async recordStep(input) {
          steps.push(input);
        },
      },
    });

    expect(output).toEqual(complianceOutput);
    expect(agent.lastContext?.toolResult.requirements.map((item) => item.text)).toEqual([
      "Permitir renegociacao apenas para contratos ativos",
      "Registrar auditoria da renegociacao",
    ]);
    expect(steps).toMatchObject([
      {
        executionId: "execution-1",
        nodeName: "requirements_extractor",
        kind: "tool",
        status: "success",
      },
      {
        executionId: "execution-1",
        nodeName: "compliance_agent",
        kind: "llm",
        status: "success",
        outputPayload: complianceOutput,
      },
    ]);
  });
});
