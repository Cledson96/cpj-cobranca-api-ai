import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewPhpGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner) {
    super("php", createReviewLanguageGraphAgents(runner));
  }
}
