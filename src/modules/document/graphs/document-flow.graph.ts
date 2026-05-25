import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import dayjs from "dayjs";
import type { RunnableConfig } from "@langchain/core/runnables";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import type { DocumentRequest, DocumentResponse } from "@shared";
import type {
  DocumentAgentLike,
  DocumentAnalysisContext,
  DocumentToolResult,
} from "@/modules/document/models";
import { DocumentAgent } from "@/modules/document/agents";
import { DeterministicDocumentToolsRunner } from "@/modules/document/tools";
import type { StructuredOutputRunner } from "@/modules/agent";

export type DocumentStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type DocumentGraphRunContext = {
  executionId?: string;
  stepRecorder?: DocumentStepRecorder;
};

export interface DocumentGraphRunner {
  invoke(input: DocumentRequest, context?: DocumentGraphRunContext): Promise<DocumentResponse>;
}

export type DocumentFlowGraphDependencies = {
  documentAgent: DocumentAgentLike;
  toolsRunner?: DeterministicDocumentToolsRunner;
};

const DocumentFlowAnnotation = Annotation.Root({
  input: Annotation<DocumentRequest>,
  executionId: Annotation<string | undefined>,
  toolResult: Annotation<DocumentToolResult | undefined>,
  output: Annotation<DocumentResponse | undefined>,
});

type DocumentFlowState = typeof DocumentFlowAnnotation.State;

export class DocumentFlowGraph implements DocumentGraphRunner {
  private readonly documentAgent: DocumentAgentLike;
  private readonly toolsRunner: DeterministicDocumentToolsRunner;
  private readonly compiledGraph: ReturnType<DocumentFlowGraph["buildGraph"]>;

  constructor(dependencies: DocumentFlowGraphDependencies) {
    this.documentAgent = dependencies.documentAgent;
    this.toolsRunner = dependencies.toolsRunner ?? new DeterministicDocumentToolsRunner();
    this.compiledGraph = this.buildGraph();
  }

  static createDefault(runner: StructuredOutputRunner): DocumentFlowGraph {
    return new DocumentFlowGraph({
      documentAgent: new DocumentAgent(runner),
    });
  }

  async invoke(input: DocumentRequest, context: DocumentGraphRunContext = {}): Promise<DocumentResponse> {
    const state = await this.compiledGraph.invoke(
      {
        input,
        executionId: context.executionId,
      },
      {
        configurable: {
          stepRecorder: context.stepRecorder,
        },
      },
    );

    if (!state.output) {
      throw new GenericError("Fluxo de documentacao nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(DocumentFlowAnnotation)
      .addNode("document_signal_extractor", (state, config) => this.runDocumentSignalExtractor(state, config))
      .addNode("document_agent", (state, config) => this.runDocumentAgent(state, config))
      .addEdge(START, "document_signal_extractor")
      .addEdge("document_signal_extractor", "document_agent")
      .addEdge("document_agent", END)
      .compile();
  }

  private readonly runDocumentSignalExtractor = async (
    state: DocumentFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();
    const output = this.toolsRunner.run(state.input);

    await this.recordStep(state, config, {
      nodeName: "document_signal_extractor",
      kind: "tool",
      inputPayload: {
        language: state.input.language,
        doc_type: state.input.doc_type,
      },
      outputPayload: output,
      startedAt,
    });

    return {
      toolResult: output,
    };
  };

  private readonly runDocumentAgent = async (
    state: DocumentFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();

    try {
      const output = await this.documentAgent.generate(this.createContext(state));
      await this.recordStep(state, config, {
        nodeName: "document_agent",
        kind: "llm",
        inputPayload: {
          publicApiCandidates: state.toolResult?.publicApiCandidates ?? [],
          findings: state.toolResult?.findings ?? [],
        },
        outputPayload: output,
        startedAt,
      });

      return {
        output,
      };
    } catch (error) {
      await this.recordStep(state, config, {
        nodeName: "document_agent",
        kind: "llm",
        inputPayload: {
          publicApiCandidates: state.toolResult?.publicApiCandidates ?? [],
          findings: state.toolResult?.findings ?? [],
        },
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  };

  private createContext(state: DocumentFlowState): DocumentAnalysisContext {
    if (!state.toolResult) {
      throw new GenericError("Resultado das tools de documentacao ausente.");
    }

    return {
      input: state.input,
      toolResult: state.toolResult,
    };
  }

  private async recordStep(
    state: DocumentFlowState,
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
    const stepRecorder = config?.configurable?.stepRecorder as DocumentStepRecorder | undefined;
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

  return "Erro desconhecido no passo de documentacao.";
}
