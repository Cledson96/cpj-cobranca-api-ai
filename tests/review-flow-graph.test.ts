import { describe, expect, it } from "vitest";
import {
  ReviewFlowGraph,
  type ReviewLanguageGraph,
  type ReviewLanguageGraphContext,
} from "@/modules/review/graphs";
import { LanguageRouter } from "@/modules/review/language";
import type { ReviewRequest, ReviewResponse, SupportedLanguage } from "@shared";

const reviewResponse: ReviewResponse = {
  overall_quality: "needs_improvement",
  score: 6,
  issues: [
    {
      severity: "medium",
      line_hint: "linha 1",
      description: "Tratamento de erro precisa ser avaliado.",
      suggestion: "Encaminhe excecoes para o middleware global.",
    },
  ],
  positives: ["Fluxo especializado executado."],
  summary: "Analise de review concluida.",
};

class FakeLanguageGraph implements ReviewLanguageGraph {
  readonly calls: ReviewLanguageGraphContext[] = [];

  constructor(readonly language: SupportedLanguage) {}

  async invoke(input: ReviewRequest, context: ReviewLanguageGraphContext): Promise<ReviewResponse> {
    this.calls.push(context);

    return {
      ...reviewResponse,
      positives: [`Fluxo ${input.language} executado.`],
    };
  }
}

function createGraph() {
  const typescriptGraph = new FakeLanguageGraph("typescript");
  const javascriptGraph = new FakeLanguageGraph("javascript");
  const pythonGraph = new FakeLanguageGraph("python");
  const phpGraph = new FakeLanguageGraph("php");
  const graph = new ReviewFlowGraph({
    languageRouter: new LanguageRouter(),
    languageGraphs: {
      typescript: typescriptGraph,
      javascript: javascriptGraph,
      python: pythonGraph,
      php: phpGraph,
    },
  });

  return {
    graph,
    typescriptGraph,
    javascriptGraph,
    pythonGraph,
    phpGraph,
  };
}

describe("ReviewFlowGraph", () => {
  it("usa o roteador sem LLM e executa apenas o fluxo da linguagem informada", async () => {
    const { graph, typescriptGraph, javascriptGraph, pythonGraph, phpGraph } = createGraph();

    const result = await graph.invoke({
      code: "export async function main() { return 1; }",
      language: "typescript",
    });

    expect(result.positives).toEqual(["Fluxo typescript executado."]);
    expect(typescriptGraph.calls).toHaveLength(1);
    expect(typescriptGraph.calls[0]?.languageProfile.language).toBe("typescript");
    expect(javascriptGraph.calls).toHaveLength(0);
    expect(pythonGraph.calls).toHaveLength(0);
    expect(phpGraph.calls).toHaveLength(0);
  });
});
