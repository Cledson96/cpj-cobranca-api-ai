import { ReviewPromptCatalog } from "../prompts";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewJavaScriptGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super("javascript", createReviewLanguageGraphAgents(runner, promptCatalog));
  }
}
