import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { reviewResponseSchema, type ReviewResponse } from "@shared";
import type { ReviewAnalysisContext } from "../models";
import { ReviewPromptCatalog } from "../prompts";

export class ReviewAggregatorAgent extends BaseSpecialistAgent<ReviewResponse, ReviewAnalysisContext> {
  private readonly promptCatalog: ReviewPromptCatalog;

  constructor(runner: StructuredOutputRunner, promptCatalog?: ReviewPromptCatalog) {
    super({
      name: "review_aggregator",
      outputSchema: reviewResponseSchema,
      outputSchemaName: "ReviewAggregatorOutput",
      runner,
    });
    this.promptCatalog = promptCatalog ?? ReviewPromptCatalog.default();
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return this.promptCatalog.getAggregatorSystemPrompt(
      context.languageProfile.toPromptContext(),
    );
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
