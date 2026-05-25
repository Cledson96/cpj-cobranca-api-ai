import { ReviewPromptCatalog } from "../prompts";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewTypeScriptGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super("typescript", createReviewLanguageGraphAgents(runner, promptCatalog));
  }
}
