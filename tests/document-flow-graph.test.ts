import { describe, expect, it } from "vitest";
import type { DocumentRequest, DocumentResponse } from "@shared";
import type { DocumentAgentLike, DocumentAnalysisContext } from "@/modules/document/models";
import { DocumentFlowGraph } from "@/modules/document/graphs";

const documentInput: DocumentRequest = {
  code: [
    "export async function chargeCustomer(customerId: string, amount: number) {",
    "  await repository.save({ customerId, amount });",
    "  return { approved: amount > 0 };",
    "}",
  ].join("\n"),
  language: "typescript",
  title: "Cobranca",
  audience: "developer",
  detail_level: "standard",
};

const documentOutput: DocumentResponse = {
  title: "Cobranca",
  summary: "Documenta a funcao de cobranca.",
  documentation: "## Cobranca\n\nA funcao `chargeCustomer` persiste uma tentativa de cobranca.",
  public_api: [
    {
      name: "chargeCustomer",
      kind: "function",
      description: "Persiste a tentativa de cobranca e retorna aprovacao.",
    },
  ],
  examples: ["await chargeCustomer('cust-1', 100)"],
  gaps: ["Nao foi possivel inferir validacoes externas."],
};

class FakeDocumentAgent implements DocumentAgentLike {
  lastContext?: DocumentAnalysisContext;

  async generate(context: DocumentAnalysisContext): Promise<DocumentResponse> {
    this.lastContext = context;
    return documentOutput;
  }
}

describe("DocumentFlowGraph", () => {
  it("executa tools, chama agente de documentacao e registra steps", async () => {
    const agent = new FakeDocumentAgent();
    const steps: unknown[] = [];
    const graph = new DocumentFlowGraph({ documentAgent: agent });

    const output = await graph.invoke(documentInput, {
      executionId: "execution-1",
      stepRecorder: {
        async recordStep(input) {
          steps.push(input);
        },
      },
    });

    expect(output).toEqual(documentOutput);
    expect(agent.lastContext?.toolResult.publicApiCandidates).toEqual([
      {
        name: "chargeCustomer",
        kind: "function",
        line_hint: "linha 1",
      },
    ]);
    expect(steps).toMatchObject([
      {
        executionId: "execution-1",
        nodeName: "document_signal_extractor",
        kind: "tool",
        status: "success",
      },
      {
        executionId: "execution-1",
        nodeName: "document_agent",
        kind: "llm",
        status: "success",
        outputPayload: documentOutput,
      },
    ]);
  });
});
