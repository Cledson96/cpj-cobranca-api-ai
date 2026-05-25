import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import {
  type ReviewAnalysisContext,
  specialistAgentOutputSchema,
  type SpecialistAgentOutput,
} from "../models";
import { ReviewPromptCatalog, type SpecialistPromptKey } from "../prompts";

export abstract class ReviewSpecialistAgent extends BaseSpecialistAgent<
  SpecialistAgentOutput,
  ReviewAnalysisContext
> {
  private readonly promptCatalog: ReviewPromptCatalog;
  private readonly promptKey: SpecialistPromptKey;

  protected constructor(input: {
    name: string;
    outputSchemaName: string;
    promptKey: SpecialistPromptKey;
    runner: StructuredOutputRunner;
    promptCatalog?: ReviewPromptCatalog;
  }) {
    super({
      name: input.name,
      outputSchema: specialistAgentOutputSchema,
      outputSchemaName: input.outputSchemaName,
      runner: input.runner,
    });
    this.promptKey = input.promptKey;
    this.promptCatalog = input.promptCatalog ?? ReviewPromptCatalog.default();
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return (context.promptCatalog ?? this.promptCatalog).getSpecialistSystemPrompt(
      this.promptKey,
      context.languageProfile.toPromptContext(),
    );
  }

  protected buildUserPrompt(context: ReviewAnalysisContext): string {
    return JSON.stringify(
      {
        linguagem: context.languageProfile.toPromptContext(),
        contexto_usuario: context.input.context ?? null,
        codigo: context.input.code,
        achados_deterministicos: context.deterministicFindings,
        saidas_agentes_anteriores: [],
      },
      null,
      2,
    );
  }
}
