import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { BaseFlowGraph } from "@/modules/agent";
import type { RunnableConfig } from "@langchain/core/runnables";
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

  constructor(dependencies: ReviewFlowGraphDependencies) {
    super();
    this.languageRouter = dependencies.languageRouter;
    this.languageGraphs = dependencies.languageGraphs;
    this.compiledGraph = this.buildGraph();
  }

  async invoke(input: ReviewRequest, context: ReviewGraphRunContext = {}): Promise<ReviewResponse> {
    const state = await this.compiledGraph.invoke(
      {
        input,
        executionId: context.executionId,
      },
      {
        configurable: {
          stepRecorder: context.stepRecorder,
        },
      }
    );

    if (!state.output) {
      throw new GenericError("Fluxo de review nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(ReviewFlowAnnotation)
      .addNode("language_router", (state, config) => this.routeLanguage(state, config))
      .addNode("review_typescript", (state, config) => this.runTypeScriptGraph(state, config))
      .addNode("review_javascript", (state, config) => this.runJavaScriptGraph(state, config))
      .addNode("review_python", (state, config) => this.runPythonGraph(state, config))
      .addNode("review_php", (state, config) => this.runPhpGraph(state, config))
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
    config?: RunnableConfig,
  ) => {
    const route = this.languageRouter.route(state.input);

    await this.recordStep(state, config, {
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
    config?: RunnableConfig,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.typescript, state, config);
  };

  private readonly runJavaScriptGraph = async (
    state: ReviewFlowState,
    config?: RunnableConfig,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.javascript, state, config);
  };

  private readonly runPythonGraph = async (
    state: ReviewFlowState,
    config?: RunnableConfig,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.python, state, config);
  };

  private readonly runPhpGraph = async (
    state: ReviewFlowState,
    config?: RunnableConfig,
  ) => {
    return this.runLanguageGraph(this.languageGraphs.php, state, config);
  };

  private async runLanguageGraph(
    graph: ReviewLanguageGraph,
    state: ReviewFlowState,
    config?: RunnableConfig,
  ) {
    if (!state.route) {
      throw new GenericError("Rota de linguagem ausente para executar review.");
    }

    const stepRecorder = config?.configurable?.stepRecorder;
    const context: ReviewLanguageGraphContext = {
      languageProfile: state.route.profile,
      executionId: state.executionId,
      stepRecorder,
    };
    const startedAt = dayjs().valueOf();

    try {
      const output = await graph.invoke(state.input, context);

      await this.recordStep(state, config, {
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
      await this.recordStep(state, config, {
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
    config: RunnableConfig | undefined,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      outputPayload?: unknown;
      startedAt: number;
      error?: unknown;
    },
  ): Promise<void> {
    const stepRecorder = config?.configurable?.stepRecorder as ReviewStepRecorder | undefined;
    if (!state.executionId || !stepRecorder) {
      return;
    }

    const errorMessage = getErrorMessage(input.error);

    await stepRecorder.recordStep({
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
