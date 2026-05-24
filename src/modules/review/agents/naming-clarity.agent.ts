import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewAnalysisContext } from "../models";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class NamingClarityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "naming_clarity",
      outputSchemaName: "NamingClarityAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      this.specialistInstructions("clareza de nomenclatura e legibilidade semantica"),
      context.languageProfile.toPromptContext(),
      "Avalie nomes de funcoes, classes, variaveis, parametros e tipos.",
    ].join("\n\n");
  }
}
