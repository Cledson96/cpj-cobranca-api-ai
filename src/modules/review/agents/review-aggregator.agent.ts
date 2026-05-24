import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { reviewResponseSchema, type ReviewResponse } from "@shared";
import type { ReviewAnalysisContext } from "../models";

export class ReviewAggregatorAgent extends BaseSpecialistAgent<ReviewResponse, ReviewAnalysisContext> {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "review_aggregator",
      outputSchema: reviewResponseSchema,
      outputSchemaName: "ReviewAggregatorOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return [
      "Voce e o agente agregador final de code review.",
      "Consolide os achados dos especialistas em uma resposta unica no contrato publico da API.",
      "Nao duplique issues equivalentes.",
      "Use score de 0 a 10 e overall_quality como good, needs_improvement ou critical.",
      context.languageProfile.toPromptContext(),
    ].join("\n\n");
  }

  protected buildUserPrompt(context: ReviewAnalysisContext): string {
    return JSON.stringify(
      {
        contexto_usuario: context.input.context ?? null,
        codigo: context.input.code,
        achados_deterministicos: context.deterministicFindings,
        saidas_especialistas: context.agentOutputs,
      },
      null,
      2,
    );
  }
}
