import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewPromptCatalog } from "../prompts";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ResourceLeakAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "resource_leak",
      outputSchemaName: "ResourceLeakAgentOutput",
      promptKey: "resource_leak",
      runner,
      promptCatalog,
    });
  }
}
