import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { createReviewLanguageGraphAgents, BaseReviewLanguageGraph } from "./review-language.graph";

export class ReviewTypeScriptGraph extends BaseReviewLanguageGraph {
  constructor(runner: StructuredOutputRunner) {
    super("typescript", createReviewLanguageGraphAgents(runner));
  }
}
