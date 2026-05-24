import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewAnalysisContext } from "../models";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ResourceLeakAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "resource_leak",
      outputSchemaName: "ResourceLeakAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      this.specialistInstructions("possiveis vazamentos de recurso e ciclo de vida de dependencias"),
      context.languageProfile.toPromptContext(),
      "Procure arquivos, conexoes, cursores, streams, timers, listeners e clients sem cleanup claro.",
    ].join("\n\n");
  }
}
