import { describe, expect, it } from "vitest";
import { BaseSpecialistAgent } from "@/modules/agent";
import {
  type AgentMessage,
  type StructuredOutputRunner,
  type StructuredOutputRunnerInput,
} from "@/modules/agent/llm";
import {
  TypeScriptLanguageProfile,
  type ReviewAnalysisContext,
  specialistAgentOutputSchema,
  type SpecialistAgentOutput,
} from "@/modules/review/language";

class FakeStructuredOutputRunner implements StructuredOutputRunner {
  readonly calls: Array<{
    schemaName: string;
    messages: AgentMessage[];
  }> = [];

  async run<TOutput extends Record<string, unknown>>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    this.calls.push({
      schemaName: input.schemaName,
      messages: input.messages,
    });

    return input.schema.parse({
      agent_name: "test_agent",
      findings: [
        {
          severity: "medium",
          line_hint: "linha 1",
          description: "Nome pouco claro para regra de negocio.",
          suggestion: "Use um nome que descreva a intencao da funcao.",
        },
      ],
      positives: ["Codigo pequeno."],
      summary: "Analise especializada concluida.",
    });
  }
}

class TestSpecialistAgent extends BaseSpecialistAgent<SpecialistAgentOutput> {
  constructor(runner: StructuredOutputRunner) {
    super({
      name: "test_agent",
      outputSchema: specialistAgentOutputSchema,
      outputSchemaName: "TestSpecialistAgentOutput",
      runner,
    });
  }

  protected buildSystemPrompt(context: ReviewAnalysisContext): string {
    return `Revise ${context.languageProfile.displayName} com foco em nomes claros.`;
  }

  protected buildUserPrompt(context: ReviewAnalysisContext): string {
    return context.input.code;
  }
}

describe("BaseSpecialistAgent", () => {
  it("executa LLM estruturado com prompts do especialista e valida a saida", async () => {
    const runner = new FakeStructuredOutputRunner();
    const agent = new TestSpecialistAgent(runner);
    const context: ReviewAnalysisContext = {
      input: {
        code: "export function x() { return 1; }",
        language: "typescript",
      },
      languageProfile: new TypeScriptLanguageProfile(),
      deterministicFindings: [],
      agentOutputs: [],
    };

    const result = await agent.analyze(context);

    expect(result.agent_name).toBe("test_agent");
    expect(result.findings[0]?.severity).toBe("medium");
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]?.schemaName).toBe("TestSpecialistAgentOutput");
    expect(runner.calls[0]?.messages).toEqual([
      {
        role: "system",
        content: "Revise TypeScript com foco em nomes claros.",
      },
      {
        role: "user",
        content: "export function x() { return 1; }",
      },
    ]);
  });
});
