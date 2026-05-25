import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import dayjs from "dayjs";
import type { RunnableConfig } from "@langchain/core/runnables";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import type { ComplianceRequest, ComplianceResponse } from "@shared";
import type {
  ComplianceAgentLike,
  ComplianceAnalysisContext,
  ComplianceToolResult,
} from "@/modules/compliance/models";
import { ComplianceAgent } from "@/modules/compliance/agents";
import { DeterministicComplianceToolsRunner } from "@/modules/compliance/tools";
import type { StructuredOutputRunner } from "@/modules/agent";
import type { CompliancePromptCatalog } from "@/modules/compliance/prompts";

export type ComplianceStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type ComplianceGraphRunContext = {
  executionId?: string;
  stepRecorder?: ComplianceStepRecorder;
  promptCatalog?: CompliancePromptCatalog;
};

export interface ComplianceGraphRunner {
  invoke(input: ComplianceRequest, context?: ComplianceGraphRunContext): Promise<ComplianceResponse>;
}

export type ComplianceFlowGraphDependencies = {
  complianceAgent: ComplianceAgentLike;
  toolsRunner?: DeterministicComplianceToolsRunner;
};

const ComplianceFlowAnnotation = Annotation.Root({
  input: Annotation<ComplianceRequest>,
  executionId: Annotation<string | undefined>,
  promptCatalog: Annotation<CompliancePromptCatalog | undefined>,
  toolResult: Annotation<ComplianceToolResult | undefined>,
  output: Annotation<ComplianceResponse | undefined>,
});

type ComplianceFlowState = typeof ComplianceFlowAnnotation.State;

export class ComplianceFlowGraph implements ComplianceGraphRunner {
  private readonly complianceAgent: ComplianceAgentLike;
  private readonly toolsRunner: DeterministicComplianceToolsRunner;
  private readonly compiledGraph: ReturnType<ComplianceFlowGraph["buildGraph"]>;

  constructor(dependencies: ComplianceFlowGraphDependencies) {
    this.complianceAgent = dependencies.complianceAgent;
    this.toolsRunner = dependencies.toolsRunner ?? new DeterministicComplianceToolsRunner();
    this.compiledGraph = this.buildGraph();
  }

  static createDefault(runner: StructuredOutputRunner): ComplianceFlowGraph {
    return new ComplianceFlowGraph({
      complianceAgent: new ComplianceAgent(runner),
    });
  }

  async invoke(input: ComplianceRequest, context: ComplianceGraphRunContext = {}): Promise<ComplianceResponse> {
    const state = await this.compiledGraph.invoke(
      {
        input,
        executionId: context.executionId,
        promptCatalog: context.promptCatalog,
      },
      {
        configurable: {
          stepRecorder: context.stepRecorder,
        },
      },
    );

    if (!state.output) {
      throw new GenericError("Fluxo de compliance nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(ComplianceFlowAnnotation)
      .addNode("requirements_extractor", (state, config) => this.runRequirementsExtractor(state, config))
      .addNode("compliance_agent", (state, config) => this.runComplianceAgent(state, config))
      .addEdge(START, "requirements_extractor")
      .addEdge("requirements_extractor", "compliance_agent")
      .addEdge("compliance_agent", END)
      .compile();
  }

  private readonly runRequirementsExtractor = async (
    state: ComplianceFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();
    const output = this.toolsRunner.run(state.input);

    await this.recordStep(state, config, {
      nodeName: "requirements_extractor",
      kind: "tool",
      inputPayload: {
        task_description: state.input.task_description,
        language: state.input.language,
      },
      outputPayload: output,
      startedAt,
    });

    return {
      toolResult: output,
    };
  };

  private readonly runComplianceAgent = async (
    state: ComplianceFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();

    try {
      const output = await this.complianceAgent.analyze(this.createContext(state));
      await this.recordStep(state, config, {
        nodeName: "compliance_agent",
        kind: "llm",
        inputPayload: {
          requirements: state.toolResult?.requirements ?? [],
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
        nodeName: "compliance_agent",
        kind: "llm",
        inputPayload: {
          requirements: state.toolResult?.requirements ?? [],
          findings: state.toolResult?.findings ?? [],
        },
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  };

  private createContext(state: ComplianceFlowState): ComplianceAnalysisContext {
    if (!state.toolResult) {
      throw new GenericError("Resultado das tools de compliance ausente.");
    }

    return {
      input: state.input,
      toolResult: state.toolResult,
      promptCatalog: state.promptCatalog,
    };
  }

  private async recordStep(
    state: ComplianceFlowState,
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
    const stepRecorder = config?.configurable?.stepRecorder as ComplianceStepRecorder | undefined;
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

  return "Erro desconhecido no passo do compliance.";
}
