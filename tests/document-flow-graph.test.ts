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
  doc_type: "technical",
};

const documentOutput: DocumentResponse = {
  doc_type: "technical",
  title: "Cobranca",
  description: "A funcao chargeCustomer persiste uma tentativa de cobranca.",
  inputs: [
    {
      name: "customerId",
      type: "string",
      description: "Identificador do cliente.",
    },
  ],
  outputs: [
    {
      name: "return",
      type: "object",
      description: "Objeto com aprovacao.",
    },
  ],
  side_effects: ["Persistencia via repository.save."],
  usage_example: "await chargeCustomer('cust-1', 100)",
  notes: "Nao foi possivel inferir validacoes externas.",
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
