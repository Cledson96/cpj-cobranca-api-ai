import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewPromptCatalog } from "../prompts";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class SecurityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "security",
      outputSchemaName: "SecurityAgentOutput",
      promptKey: "security",
      runner,
      promptCatalog,
    });
  }
}
