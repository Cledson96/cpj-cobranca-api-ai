import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { complianceResponseSchema, type ComplianceResponse } from "@shared";
import type { ComplianceAnalysisContext } from "@/modules/compliance/models";
import { CompliancePromptCatalog } from "@/modules/compliance/prompts";

export class ComplianceAgent extends BaseSpecialistAgent<ComplianceResponse, ComplianceAnalysisContext> {
  private readonly promptCatalog: CompliancePromptCatalog;

  constructor(runner: StructuredOutputRunner, promptCatalog?: CompliancePromptCatalog) {
    super({
      name: "compliance_agent",
      outputSchema: complianceResponseSchema,
      outputSchemaName: "ComplianceAgentOutput",
      runner,
    });
    this.promptCatalog = promptCatalog ?? CompliancePromptCatalog.default();
  }

  protected buildSystemPrompt(context: ComplianceAnalysisContext): string {
    return (context.promptCatalog ?? this.promptCatalog).getAgentSystemPrompt(
      `Linguagem: ${context.input.language}`,
    );
  }

  protected buildUserPrompt(context: ComplianceAnalysisContext): string {
    return JSON.stringify(
      {
        task_description: context.input.task_description,
        codigo: context.input.code,
        requisitos_candidatos: context.toolResult.requirements,
        sinais_deterministicos: context.toolResult.findings,
      },
      null,
      2,
    );
  }
}
