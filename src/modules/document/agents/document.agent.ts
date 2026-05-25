import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { documentResponseSchema, type DocumentResponse } from "@shared";
import type { DocumentAnalysisContext } from "@/modules/document/models";
import { DocumentPromptCatalog } from "@/modules/document/prompts";

export class DocumentAgent extends BaseSpecialistAgent<DocumentResponse, DocumentAnalysisContext> {
  private readonly promptCatalog: DocumentPromptCatalog;

  constructor(runner: StructuredOutputRunner, promptCatalog?: DocumentPromptCatalog) {
    super({
      name: "document_agent",
      outputSchema: documentResponseSchema,
      outputSchemaName: "DocumentAgentOutput",
      runner,
    });
    this.promptCatalog = promptCatalog ?? DocumentPromptCatalog.default();
  }

  generate(context: DocumentAnalysisContext): Promise<DocumentResponse> {
    return this.analyze(context);
  }

  protected buildSystemPrompt(context: DocumentAnalysisContext): string {
    return this.promptCatalog.getAgentSystemPrompt([
      `Linguagem: ${context.input.language}`,
      `Publico: ${context.input.audience ?? "developer"}`,
      `Nivel de detalhe: ${context.input.detail_level ?? "standard"}`,
    ].join("\n"));
  }

  protected buildUserPrompt(context: DocumentAnalysisContext): string {
    return JSON.stringify(
      {
        titulo: context.input.title,
        codigo: context.input.code,
        api_publica_detectada: context.toolResult.publicApiCandidates,
        sinais_deterministicos: context.toolResult.findings,
      },
      null,
      2,
    );
  }
}
