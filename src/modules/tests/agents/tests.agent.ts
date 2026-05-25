import { BaseSpecialistAgent } from "@/modules/agent";
import type { StructuredOutputRunner } from "@/modules/agent/llm";
import { testsResponseSchema, type TestsResponse } from "@shared";
import type { TestsAnalysisContext } from "@/modules/tests/models";
import { TestsPromptCatalog } from "@/modules/tests/prompts";

export class TestsAgent extends BaseSpecialistAgent<TestsResponse, TestsAnalysisContext> {
  private readonly promptCatalog: TestsPromptCatalog;

  constructor(runner: StructuredOutputRunner, promptCatalog?: TestsPromptCatalog) {
    super({
      name: "tests_agent",
      outputSchema: testsResponseSchema,
      outputSchemaName: "TestsAgentOutput",
      runner,
    });
    this.promptCatalog = promptCatalog ?? TestsPromptCatalog.default();
  }

  generate(context: TestsAnalysisContext): Promise<TestsResponse> {
    return this.analyze(context);
  }

  protected buildSystemPrompt(context: TestsAnalysisContext): string {
    return this.promptCatalog.getAgentSystemPrompt([
      `Linguagem: ${context.input.language}`,
      `Framework: ${context.input.test_framework}`,
    ].join("\n"));
  }

  protected buildUserPrompt(context: TestsAnalysisContext): string {
    return JSON.stringify(
      {
        test_framework: context.input.test_framework,
        codigo: context.input.code,
        comportamentos_candidatos: context.toolResult.behaviorCandidates,
        sinais_deterministicos: context.toolResult.findings,
      },
      null,
      2,
    );
  }
}
