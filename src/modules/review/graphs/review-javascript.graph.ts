import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewJavaScriptGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner) {
    super("javascript", createReviewLanguageGraphAgents(runner));
  }
}
