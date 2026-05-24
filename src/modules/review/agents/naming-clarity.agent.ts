import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewPromptCatalog } from "../prompts";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class NamingClarityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "naming_clarity",
      outputSchemaName: "NamingClarityAgentOutput",
      promptKey: "naming_clarity",
      runner,
      promptCatalog,
    });
  }
}
