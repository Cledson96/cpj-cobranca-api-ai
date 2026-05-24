import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewAnalysisContext } from "../models";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ErrorHandlingAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "error_handling",
      outputSchemaName: "ErrorHandlingAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      this.specialistInstructions("tratamento de erros, falhas silenciosas e propagacao correta"),
      context.languageProfile.toPromptContext(),
      "Procure ausencia de tratamento em I/O, promessas, validacoes e dependencias externas.",
    ].join("\n\n");
  }
}
