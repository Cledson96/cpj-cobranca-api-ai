import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { BaseFlowGraph } from "@/modules/agent";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { ReviewRequest, ReviewResponse } from "@shared";
import dayjs from "dayjs";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import { LanguageRouter, type ReviewLanguageRoute } from "../language";
import type { ReviewGraphNode } from "../language";
import type { ReviewLanguageGraph, ReviewLanguageGraphContext } from "./review-language.graph";

export type ReviewStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type ReviewGraphRunContext = {
  executionId?: string;
  stepRecorder?: ReviewStepRecorder;
};

export interface ReviewGraphRunner {
  invoke(input: ReviewRequest, context?: ReviewGraphRunContext): Promise<ReviewResponse>;
}

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
  executionId: Annotation<string | undefined>,
  route: Annotation<ReviewLanguageRoute | undefined>,
  output: Annotation<ReviewResponse | undefined>,
});

type ReviewFlowState = typeof ReviewFlowAnnotation.State;

export class ReviewFlowGraph extends BaseFlowGraph<ReviewRequest, ReviewResponse> implements ReviewGraphRunner {
  private readonly languageRouter: LanguageRouter;
  private readonly languageGraphs: ReviewLanguageGraphs;
  private readonly compiledGraph: ReturnType<ReviewFlowGraph["buildGraph"]>;
  private currentStepRecorder?: ReviewStepRecorder;

  constructor(dependencies: ReviewFlowGraphDependencies) {
    super();
    this.languageRouter = dependencies.languageRouter;
    this.languageGraphs = dependencies.languageGraphs;
    this.compiledGraph = this.buildGraph();
  }

  async invoke(input: ReviewRequest, context: ReviewGraphRunContext = {}): Promise<ReviewResponse> {
    this.currentStepRecorder = context.stepRecorder;

    const state = await this.compiledGraph.invoke({
      input,
      executionId: context.executionId,
    });

    if (!state.output) {
      throw new GenericError("Fluxo de review nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(ReviewFlowAnnotation)
      .addNode("language_router", (state) => this.routeLanguage(state))
      .addNode("review_typescript", (state) => this.runTypeScriptGraph(state))
      .addNode("review_javascript", (state) => this.runJavaScriptGraph(state))
      .addNode("review_python", (state) => this.runPythonGraph(state))
      .addNode("review_php", (state) => this.runPhpGraph(state))
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

  private readonly routeLanguage = async (
    state: ReviewFlowState,
  ) => {
    const route = this.languageRouter.route(state.input);

    await this.recordStep(state, {
      nodeName: "language_router",
      kind: "system",
      inputPayload: {
        language: state.input.language,
      },
      outputPayload: {
        language: route.language,
        graphNode: route.graphNode,
      },
      startedAt: dayjs().valueOf(),
    });

    return { route };
  };

  private readonly selectGraphNode = (state: ReviewFlowState): ReviewGraphNode => {
    if (!state.route) {
      throw new GenericError("Roteamento de linguagem nao foi criado.");
    }

    return state.route.graphNode;
  };

  private readonly runTypeScriptGraph = async (
    state: ReviewFlowState,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.typescript, state);
  };

  private readonly runJavaScriptGraph = async (
    state: ReviewFlowState,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.javascript, state);
  };

  private readonly runPythonGraph = async (
    state: ReviewFlowState,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.python, state);
  };

  private readonly runPhpGraph = async (
    state: ReviewFlowState,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.php, state);
  };

  private async runLanguageGraph(
    graph: ReviewLanguageGraph,
    state: ReviewFlowState,
  ) {
    if (!state.route) {
      throw new GenericError("Rota de linguagem ausente para executar review.");
    }

    const context: ReviewLanguageGraphContext = {
      languageProfile: state.route.profile,
      executionId: state.executionId,
      stepRecorder: this.currentStepRecorder,
    };
    const startedAt = dayjs().valueOf();

    try {
      const output = await graph.invoke(state.input, context);

      await this.recordStep(state, {
        nodeName: state.route.graphNode,
        kind: "system",
        inputPayload: {
          language: state.route.language,
        },
        outputPayload: output,
        startedAt,
      });

      return {
        output,
      };
    } catch (error) {
      await this.recordStep(state, {
        nodeName: state.route.graphNode,
        kind: "system",
        inputPayload: {
          language: state.route.language,
        },
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  }

  private async recordStep(
    state: ReviewFlowState,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      outputPayload?: unknown;
      startedAt: number;
      error?: unknown;
    },
  ): Promise<void> {
    if (!state.executionId || !this.currentStepRecorder) {
      return;
    }

    const errorMessage = getErrorMessage(input.error);

    await this.currentStepRecorder.recordStep({
      executionId: state.executionId,
      nodeName: input.nodeName,
      kind: input.kind,
      status: errorMessage ? "failed" : "success",
      inputPayload: input.inputPayload,
      outputPayload: input.outputPayload,
      durationMs: dayjs().valueOf() - input.startedAt,
      errorMessage,
    });
  }
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no passo do review.";
}
