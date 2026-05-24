import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import dayjs from "dayjs";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import type { ReviewRequest, ReviewResponse, SupportedLanguage } from "@shared";
import {
  ComplexityAgent,
  ErrorHandlingAgent,
  NamingClarityAgent,
  ResourceLeakAgent,
  ReviewAggregatorAgent,
  SecurityAgent,
  type ReviewSpecialistAgent,
} from "../agents";
import type {
  ReviewAnalysisContext,
  ReviewFinding,
  SpecialistAgentOutput,
} from "../models";
import { ReviewPromptCatalog } from "../prompts";
import { DeterministicReviewToolsRunner } from "../tools";
import type { LanguageProfile } from "../language";
import type { ReviewStepRecorder } from "./review-flow.graph";

export type ReviewLanguageGraphContext = {
  languageProfile: LanguageProfile;
  executionId?: string;
  stepRecorder?: ReviewStepRecorder;
};

export interface ReviewLanguageGraph {
  readonly language: SupportedLanguage;
  invoke(input: ReviewRequest, context: ReviewLanguageGraphContext): Promise<ReviewResponse>;
}

export type ReviewLanguageGraphAgents = {
  namingClarityAgent: ReviewSpecialistAgent;
  errorHandlingAgent: ReviewSpecialistAgent;
  resourceLeakAgent: ReviewSpecialistAgent;
  complexityAgent: ReviewSpecialistAgent;
  securityAgent: ReviewSpecialistAgent;
  reviewAggregatorAgent: ReviewAggregatorAgent;
  toolsRunner: DeterministicReviewToolsRunner;
};

const ReviewLanguageAnnotation = Annotation.Root({
  input: Annotation<ReviewRequest>,
  languageProfile: Annotation<LanguageProfile>,
  executionId: Annotation<string | undefined>,
  stepRecorder: Annotation<ReviewStepRecorder | undefined>,
  deterministicFindings: Annotation<ReviewFinding[]>({
    reducer: (_left: ReviewFinding[], right: ReviewFinding[]) => right,
    default: () => [],
  }),
  agentOutputs: Annotation<SpecialistAgentOutput[]>({
    reducer: (left: SpecialistAgentOutput[], right: SpecialistAgentOutput[]) => left.concat(right),
    default: () => [],
  }),
  output: Annotation<ReviewResponse | undefined>,
});

type ReviewLanguageState = typeof ReviewLanguageAnnotation.State;

export abstract class BaseReviewLanguageGraph implements ReviewLanguageGraph {
  protected readonly agents: ReviewLanguageGraphAgents;

  protected constructor(
    readonly language: SupportedLanguage,
    agents: ReviewLanguageGraphAgents,
  ) {
    this.agents = agents;
  }

  async invoke(input: ReviewRequest, context: ReviewLanguageGraphContext): Promise<ReviewResponse> {
    const graph = this.buildGraph();
    const state = await graph.invoke({
      input,
      languageProfile: context.languageProfile,
      executionId: context.executionId,
      stepRecorder: context.stepRecorder,
    });

    if (!state.output) {
      throw new GenericError(`Fluxo de review ${this.language} nao gerou resposta final.`);
    }

    return state.output;
  }

  private buildGraph() {
    return new StateGraph(ReviewLanguageAnnotation)
      .addNode("deterministic_tools", this.runDeterministicTools)
      .addNode("naming_clarity_agent", this.runNamingClarityAgent)
      .addNode("error_handling_agent", this.runErrorHandlingAgent)
      .addNode("resource_leak_agent", this.runResourceLeakAgent)
      .addNode("complexity_agent", this.runComplexityAgent)
      .addNode("security_agent", this.runSecurityAgent)
      .addNode("review_aggregator_agent", this.runReviewAggregatorAgent)
      .addEdge(START, "deterministic_tools")
      .addEdge("deterministic_tools", "naming_clarity_agent")
      .addEdge("deterministic_tools", "error_handling_agent")
      .addEdge("deterministic_tools", "resource_leak_agent")
      .addEdge("deterministic_tools", "complexity_agent")
      .addEdge("deterministic_tools", "security_agent")
      .addEdge([
        "naming_clarity_agent",
        "error_handling_agent",
        "resource_leak_agent",
        "complexity_agent",
        "security_agent",
      ], "review_aggregator_agent")
      .addEdge("review_aggregator_agent", END)
      .compile();
  }

  private readonly runDeterministicTools = async (state: ReviewLanguageState) => {
    const output = this.agents.toolsRunner.run(state.input);

    await this.recordStep(state, {
      nodeName: "deterministic_tools",
      kind: "tool",
      inputPayload: {
        language: state.input.language,
        code: state.input.code,
      },
      outputPayload: output,
      startedAt: dayjs().valueOf(),
    });

    return {
      deterministicFindings: output,
    };
  };

  private readonly runNamingClarityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist("naming_clarity_agent", this.agents.namingClarityAgent, state);
  };

  private readonly runErrorHandlingAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist("error_handling_agent", this.agents.errorHandlingAgent, state);
  };

  private readonly runResourceLeakAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist("resource_leak_agent", this.agents.resourceLeakAgent, state);
  };

  private readonly runComplexityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist("complexity_agent", this.agents.complexityAgent, state);
  };

  private readonly runSecurityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist("security_agent", this.agents.securityAgent, state);
  };

  private readonly runReviewAggregatorAgent = async (state: ReviewLanguageState) => {
    const output = await this.runRecordedOperation(state, {
      nodeName: "review_aggregator_agent",
      kind: "llm",
      inputPayload: this.createContextPayload(state),
      operation: () => this.agents.reviewAggregatorAgent.analyze(this.createContext(state)),
    });

    return {
      output,
    };
  };

  private async runSpecialist(
    nodeName: string,
    agent: ReviewSpecialistAgent,
    state: ReviewLanguageState,
  ) {
    const output = await this.runRecordedOperation(state, {
      nodeName,
      kind: "llm",
      inputPayload: this.createContextPayload(state),
      operation: () => agent.analyze(this.createContext(state)),
    });

    return {
      agentOutputs: [output],
    };
  }

  private createContext(state: ReviewLanguageState): ReviewAnalysisContext {
    return {
      input: state.input,
      languageProfile: state.languageProfile,
      deterministicFindings: state.deterministicFindings,
      agentOutputs: state.agentOutputs,
    };
  }

  private createContextPayload(state: ReviewLanguageState): unknown {
    return {
      language: state.languageProfile.language,
      deterministicFindings: state.deterministicFindings,
      agentOutputs: state.agentOutputs,
    };
  }

  private async runRecordedOperation<TOutput>(
    state: ReviewLanguageState,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      operation: () => Promise<TOutput>;
    },
  ): Promise<TOutput> {
    const startedAt = dayjs().valueOf();

    try {
      const output = await input.operation();
      await this.recordStep(state, {
        nodeName: input.nodeName,
        kind: input.kind,
        inputPayload: input.inputPayload,
        outputPayload: output,
        startedAt,
      });

      return output;
    } catch (error) {
      await this.recordStep(state, {
        nodeName: input.nodeName,
        kind: input.kind,
        inputPayload: input.inputPayload,
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  }

  private async recordStep(
    state: ReviewLanguageState,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      outputPayload?: unknown;
      startedAt: number;
      error?: unknown;
    },
  ): Promise<void> {
    if (!state.executionId || !state.stepRecorder) {
      return;
    }

    const errorMessage = getErrorMessage(input.error);

    await state.stepRecorder.recordStep({
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

export function createReviewLanguageGraphAgents(
  runner: ConstructorParameters<typeof NamingClarityAgent>[0],
): ReviewLanguageGraphAgents {
  const promptCatalog = ReviewPromptCatalog.default();

  return {
    namingClarityAgent: new NamingClarityAgent(runner, promptCatalog),
    errorHandlingAgent: new ErrorHandlingAgent(runner, promptCatalog),
    resourceLeakAgent: new ResourceLeakAgent(runner, promptCatalog),
    complexityAgent: new ComplexityAgent(runner, promptCatalog),
    securityAgent: new SecurityAgent(runner, promptCatalog),
    reviewAggregatorAgent: new ReviewAggregatorAgent(runner, promptCatalog),
    toolsRunner: new DeterministicReviewToolsRunner(),
  };
}
