import {
  BaseAgentEngine,
  LangChainStructuredOutputRunner,
  OpenRouterChatFactory,
} from "@/modules/agent";
import type { AppEnv, ReviewRequest, ReviewResponse } from "@shared";
import { loadEnv } from "@shared";
import { LanguageRouter } from "../language";
import {
  ReviewFlowGraph,
  ReviewJavaScriptGraph,
  ReviewPhpGraph,
  ReviewPythonGraph,
  ReviewTypeScriptGraph,
} from "../graphs";

export class ReviewEngine extends BaseAgentEngine<ReviewRequest, ReviewResponse> {
  constructor(private readonly graph: ReviewFlowGraph) {
    super("review");
  }

  static createDefault(env: AppEnv = loadEnv()): ReviewEngine {
    const chatModel = new OpenRouterChatFactory(env).create();
    const structuredOutputRunner = new LangChainStructuredOutputRunner(chatModel);

    return new ReviewEngine(
      new ReviewFlowGraph({
        languageRouter: new LanguageRouter(),
        languageGraphs: {
          typescript: new ReviewTypeScriptGraph(structuredOutputRunner),
          javascript: new ReviewJavaScriptGraph(structuredOutputRunner),
          python: new ReviewPythonGraph(structuredOutputRunner),
          php: new ReviewPhpGraph(structuredOutputRunner),
        },
      }),
    );
  }

  protected invoke(input: ReviewRequest): Promise<ReviewResponse> {
    return this.graph.invoke(input);
  }
}
