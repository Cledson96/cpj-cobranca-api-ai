import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewAnalysisContext } from "../models";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class ComplexityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "complexity",
      outputSchemaName: "ComplexityAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      this.specialistInstructions("complexidade ciclomatica percebida, legibilidade e divisao de responsabilidades"),
      context.languageProfile.toPromptContext(),
      "Avalie condicionais, loops, aninhamento, tamanho de funcoes e mistura de responsabilidades.",
    ].join("\n\n");
  }
}
