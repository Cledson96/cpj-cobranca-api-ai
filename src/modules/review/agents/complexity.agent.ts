import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewPromptCatalog } from "../prompts";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ComplexityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "complexity",
      outputSchemaName: "ComplexityAgentOutput",
      promptKey: "complexity",
      runner,
      promptCatalog,
    });
  }
}
