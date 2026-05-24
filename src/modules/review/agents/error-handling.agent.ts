import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewPromptCatalog } from "../prompts";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ErrorHandlingAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "error_handling",
      outputSchemaName: "ErrorHandlingAgentOutput",
      promptKey: "error_handling",
      runner,
      promptCatalog,
    });
  }
}
