import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import {
  type ReviewAnalysisContext,
  specialistAgentOutputSchema,
  type SpecialistAgentOutput,
} from "../models";

export abstract class ReviewSpecialistAgent extends BaseSpecialistAgent<
  SpecialistAgentOutput,
  ReviewAnalysisContext
> {
  protected constructor(input: {
    name: string;
    outputSchemaName: string;
    runner: StructuredOutputRunner;
  }) {
    super({
      name: input.name,
      outputSchema: specialistAgentOutputSchema,
      outputSchemaName: input.outputSchemaName,
      runner: input.runner,
    });
  }

  protected buildUserPrompt(context: ReviewAnalysisContext): string {
    return JSON.stringify(
      {
        linguagem: context.languageProfile.toPromptContext(),
        contexto_usuario: context.input.context ?? null,
        codigo: context.input.code,
        achados_deterministicos: context.deterministicFindings,
        saidas_agentes_anteriores: context.agentOutputs,
      },
      null,
      2,
    );
  }

  protected specialistInstructions(focus: string): string {
    return [
      "Voce e um agente especialista de code review.",
      "Responda somente no schema estruturado solicitado.",
      "Nao invente linha exata quando nao houver evidencia; use line_hint como null.",
      "Classifique severidade como low, medium ou high.",
      `Foco principal: ${focus}.`,
    ].join("\n");
  }
}
