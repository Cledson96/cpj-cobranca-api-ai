import { ReviewPromptCatalog } from "../prompts";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewPhpGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super("php", createReviewLanguageGraphAgents(runner, promptCatalog));
  }
}
