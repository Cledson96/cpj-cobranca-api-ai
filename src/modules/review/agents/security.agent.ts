import type { StructuredOutputRunner } from "@/modules/agent/llm";
import type { ReviewAnalysisContext } from "../models";
import { ReviewSpecialistAgent } from "./review-specialist.agent";

export class SecurityAgent extends ReviewSpecialistAgent {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "security",
      outputSchemaName: "SecurityAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      this.specialistInstructions("padroes comuns de seguranca e exposicao indevida de dados"),
      context.languageProfile.toPromptContext(),
      "Procure SQL injection, command injection, logs sensiveis, eval, entrada externa sem validacao e segredos hardcoded.",
    ].join("\n\n");
  }
}
