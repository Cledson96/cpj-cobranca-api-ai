import { z } from "zod";
import promptData from "./tests-prompts.json";

const LANGUAGE_CONTEXT_PLACEHOLDER = "{{language_context}}";

const testsPromptExampleSchema = z.object({
  title: z.string().trim().min(1),
  input: z.string().trim().min(1),
  expected: z.string().trim().min(1),
});

const testsPromptEntrySchema = z.object({
  role: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  examples: z.array(testsPromptExampleSchema).default([]),
});

const testsPromptCatalogSchema = z.object({
  agent: testsPromptEntrySchema,
});

type TestsPromptEntry = z.infer<typeof testsPromptEntrySchema>;

export class TestsPromptCatalog {
  private constructor(private readonly agentTemplate: string) {}

  static default(): TestsPromptCatalog {
    const parsed = testsPromptCatalogSchema.parse(promptData);
    return new TestsPromptCatalog(this.createTemplate(parsed.agent));
  }

  static fromTemplate(agentTemplate: string): TestsPromptCatalog {
    return new TestsPromptCatalog(agentTemplate);
  }

  static defaultTemplate(): string {
    const parsed = testsPromptCatalogSchema.parse(promptData);
    return this.createTemplate(parsed.agent);
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.agentTemplate.replace(LANGUAGE_CONTEXT_PLACEHOLDER, languageContext);
  }

  private static createTemplate(entry: TestsPromptEntry): string {
    const sections = [
      entry.role,
      LANGUAGE_CONTEXT_PLACEHOLDER,
      this.formatInstructions(entry.instructions),
    ];

    if (entry.examples.length > 0) {
      sections.push(this.formatExamples(entry.examples));
    }

    return sections.join("\n\n");
  }

  private static formatInstructions(instructions: string[]): string {
    return [
      "Instrucoes:",
      ...instructions.map((instruction) => `- ${instruction}`),
    ].join("\n");
  }

  private static formatExamples(examples: TestsPromptEntry["examples"]): string {
    return [
      "Exemplos:",
      ...examples.map((example) => [
        `${example.title}:`,
        `Entrada: ${example.input}`,
        `Resposta esperada: ${example.expected}`,
      ].join("\n")),
    ].join("\n\n");
  }
}
