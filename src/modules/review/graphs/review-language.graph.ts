import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { GenericError } from "@/infrastructure/errors";
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
import { DeterministicReviewToolsRunner } from "../tools";
import type { LanguageProfile } from "../language";

export type ReviewLanguageGraphContext = {
  languageProfile: LanguageProfile;
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
      .addEdge("naming_clarity_agent", "error_handling_agent")
      .addEdge("error_handling_agent", "resource_leak_agent")
      .addEdge("resource_leak_agent", "complexity_agent")
      .addEdge("complexity_agent", "security_agent")
      .addEdge("security_agent", "review_aggregator_agent")
      .addEdge("review_aggregator_agent", END)
      .compile();
  }

  private readonly runDeterministicTools = (state: ReviewLanguageState) => {
    return {
      deterministicFindings: this.agents.toolsRunner.run(state.input),
    };
  };

  private readonly runNamingClarityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist(this.agents.namingClarityAgent, state);
  };

  private readonly runErrorHandlingAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist(this.agents.errorHandlingAgent, state);
  };

  private readonly runResourceLeakAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist(this.agents.resourceLeakAgent, state);
  };

  private readonly runComplexityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist(this.agents.complexityAgent, state);
  };

  private readonly runSecurityAgent = async (state: ReviewLanguageState) => {
    return this.runSpecialist(this.agents.securityAgent, state);
  };

  private readonly runReviewAggregatorAgent = async (state: ReviewLanguageState) => {
    const output = await this.agents.reviewAggregatorAgent.analyze(this.createContext(state));

    return {
      output,
    };
  };

  private async runSpecialist(agent: ReviewSpecialistAgent, state: ReviewLanguageState) {
    const output = await agent.analyze(this.createContext(state));

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
}

export function createReviewLanguageGraphAgents(
  runner: ConstructorParameters<typeof NamingClarityAgent>[0],
): ReviewLanguageGraphAgents {
  return {
    namingClarityAgent: new NamingClarityAgent(runner),
    errorHandlingAgent: new ErrorHandlingAgent(runner),
    resourceLeakAgent: new ResourceLeakAgent(runner),
    complexityAgent: new ComplexityAgent(runner),
    securityAgent: new SecurityAgent(runner),
    reviewAggregatorAgent: new ReviewAggregatorAgent(runner),
    toolsRunner: new DeterministicReviewToolsRunner(),
  };
}
