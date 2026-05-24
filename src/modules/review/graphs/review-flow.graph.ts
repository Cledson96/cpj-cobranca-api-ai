import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { BaseFlowGraph } from "@/modules/agent";
import { GenericError } from "@/infrastructure/errors";
import type { ReviewRequest, ReviewResponse } from "@shared";
import { LanguageRouter, type ReviewLanguageRoute } from "../language";
import type { ReviewGraphNode } from "../language";
import type { ReviewLanguageGraph, ReviewLanguageGraphContext } from "./review-language.graph";

export type ReviewLanguageGraphs = {
  typescript: ReviewLanguageGraph;
  javascript: ReviewLanguageGraph;
  python: ReviewLanguageGraph;
  php: ReviewLanguageGraph;
};

export type ReviewFlowGraphDependencies = {
  languageRouter: LanguageRouter;
  languageGraphs: ReviewLanguageGraphs;
};

const ReviewFlowAnnotation = Annotation.Root({
  input: Annotation<ReviewRequest>,
  route: Annotation<ReviewLanguageRoute | undefined>,
  output: Annotation<ReviewResponse | undefined>,
});

type ReviewFlowState = typeof ReviewFlowAnnotation.State;

export class ReviewFlowGraph extends BaseFlowGraph<ReviewRequest, ReviewResponse> {
  private readonly languageRouter: LanguageRouter;
  private readonly languageGraphs: ReviewLanguageGraphs;

  constructor(dependencies: ReviewFlowGraphDependencies) {
    super();
    this.languageRouter = dependencies.languageRouter;
    this.languageGraphs = dependencies.languageGraphs;
  }

  async invoke(input: ReviewRequest): Promise<ReviewResponse> {
    const graph = this.buildGraph();
    const state = await graph.invoke({ input });

    if (!state.output) {
      throw new GenericError("Fluxo de review nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(ReviewFlowAnnotation)
      .addNode("language_router", this.routeLanguage)
      .addNode("review_typescript", this.runTypeScriptGraph)
      .addNode("review_javascript", this.runJavaScriptGraph)
      .addNode("review_python", this.runPythonGraph)
      .addNode("review_php", this.runPhpGraph)
      .addEdge(START, "language_router")
      .addConditionalEdges("language_router", this.selectGraphNode, {
        review_typescript: "review_typescript",
        review_javascript: "review_javascript",
        review_python: "review_python",
        review_php: "review_php",
      })
      .addEdge("review_typescript", END)
      .addEdge("review_javascript", END)
      .addEdge("review_python", END)
      .addEdge("review_php", END)
      .compile();
  }

  private readonly routeLanguage = (state: ReviewFlowState) => {
    return {
      route: this.languageRouter.route(state.input),
    };
  };

  private readonly selectGraphNode = (state: ReviewFlowState): ReviewGraphNode => {
    if (!state.route) {
      throw new GenericError("Roteamento de linguagem nao foi criado.");
    }

    return state.route.graphNode;
  };

  private readonly runTypeScriptGraph = async (state: ReviewFlowState) => {
    return this.runLanguageGraph(this.languageGraphs.typescript, state);
  };

  private readonly runJavaScriptGraph = async (state: ReviewFlowState) => {
    return this.runLanguageGraph(this.languageGraphs.javascript, state);
  };

  private readonly runPythonGraph = async (state: ReviewFlowState) => {
    return this.runLanguageGraph(this.languageGraphs.python, state);
  };

  private readonly runPhpGraph = async (state: ReviewFlowState) => {
    return this.runLanguageGraph(this.languageGraphs.php, state);
  };

  private async runLanguageGraph(graph: ReviewLanguageGraph, state: ReviewFlowState) {
    if (!state.route) {
      throw new GenericError("Rota de linguagem ausente para executar review.");
    }

    const context: ReviewLanguageGraphContext = {
      languageProfile: state.route.profile,
    };
    const output = await graph.invoke(state.input, context);

    return {
      output,
    };
  }
}
