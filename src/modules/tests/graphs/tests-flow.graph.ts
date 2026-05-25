import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import dayjs from "dayjs";
import type { RunnableConfig } from "@langchain/core/runnables";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import type { TestsRequest, TestsResponse } from "@shared";
import type {
  TestsAgentLike,
  TestsAnalysisContext,
  TestsToolResult,
} from "@/modules/tests/models";
import { TestsAgent } from "@/modules/tests/agents";
import { DeterministicTestsToolsRunner } from "@/modules/tests/tools";
import type { StructuredOutputRunner } from "@/modules/agent";
import type { TestsPromptCatalog } from "@/modules/tests/prompts";

export type TestsStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type TestsGraphRunContext = {
  executionId?: string;
  stepRecorder?: TestsStepRecorder;
  promptCatalog?: TestsPromptCatalog;
};

export interface TestsGraphRunner {
  invoke(input: TestsRequest, context?: TestsGraphRunContext): Promise<TestsResponse>;
}

export type TestsFlowGraphDependencies = {
  testsAgent: TestsAgentLike;
  toolsRunner?: DeterministicTestsToolsRunner;
};

const TestsFlowAnnotation = Annotation.Root({
  input: Annotation<TestsRequest>,
  executionId: Annotation<string | undefined>,
  promptCatalog: Annotation<TestsPromptCatalog | undefined>,
  toolResult: Annotation<TestsToolResult | undefined>,
  output: Annotation<TestsResponse | undefined>,
});

type TestsFlowState = typeof TestsFlowAnnotation.State;

export class TestsFlowGraph implements TestsGraphRunner {
  private readonly testsAgent: TestsAgentLike;
  private readonly toolsRunner: DeterministicTestsToolsRunner;
  private readonly compiledGraph: ReturnType<TestsFlowGraph["buildGraph"]>;

  constructor(dependencies: TestsFlowGraphDependencies) {
    this.testsAgent = dependencies.testsAgent;
    this.toolsRunner = dependencies.toolsRunner ?? new DeterministicTestsToolsRunner();
    this.compiledGraph = this.buildGraph();
  }

  static createDefault(runner: StructuredOutputRunner): TestsFlowGraph {
    return new TestsFlowGraph({
      testsAgent: new TestsAgent(runner),
    });
  }

  async invoke(input: TestsRequest, context: TestsGraphRunContext = {}): Promise<TestsResponse> {
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
      throw new GenericError("Fluxo de testes nao gerou resposta final.");
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(TestsFlowAnnotation)
      .addNode("tests_signal_extractor", (state, config) => this.runTestsSignalExtractor(state, config))
      .addNode("tests_agent", (state, config) => this.runTestsAgent(state, config))
      .addEdge(START, "tests_signal_extractor")
      .addEdge("tests_signal_extractor", "tests_agent")
      .addEdge("tests_agent", END)
      .compile();
  }

  private readonly runTestsSignalExtractor = async (
    state: TestsFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();
    const output = this.toolsRunner.run(state.input);

    await this.recordStep(state, config, {
      nodeName: "tests_signal_extractor",
      kind: "tool",
      inputPayload: {
        language: state.input.language,
        test_framework: state.input.test_framework,
      },
      outputPayload: output,
      startedAt,
    });

    return {
      toolResult: output,
    };
  };

  private readonly runTestsAgent = async (
    state: TestsFlowState,
    config?: RunnableConfig,
  ) => {
    const startedAt = dayjs().valueOf();

    try {
      const output = await this.testsAgent.generate(this.createContext(state));
      await this.recordStep(state, config, {
        nodeName: "tests_agent",
        kind: "llm",
        inputPayload: {
          behaviorCandidates: state.toolResult?.behaviorCandidates ?? [],
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
        nodeName: "tests_agent",
        kind: "llm",
        inputPayload: {
          behaviorCandidates: state.toolResult?.behaviorCandidates ?? [],
          findings: state.toolResult?.findings ?? [],
        },
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  };

  private createContext(state: TestsFlowState): TestsAnalysisContext {
    if (!state.toolResult) {
      throw new GenericError("Resultado das tools de testes ausente.");
    }

    return {
      input: state.input,
      toolResult: state.toolResult,
      promptCatalog: state.promptCatalog,
    };
  }

  private async recordStep(
    state: TestsFlowState,
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
    const stepRecorder = config?.configurable?.stepRecorder as TestsStepRecorder | undefined;
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

  return "Erro desconhecido no passo de testes.";
}
