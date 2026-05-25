import { z } from "zod";
import promptData from "./tests-prompts.json";

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

type TestsPromptCatalogData = z.infer<typeof testsPromptCatalogSchema>;
type TestsPromptEntry = z.infer<typeof testsPromptEntrySchema>;

export class TestsPromptCatalog {
  private constructor(private readonly data: TestsPromptCatalogData) {}

  static default(): TestsPromptCatalog {
    return new TestsPromptCatalog(testsPromptCatalogSchema.parse(promptData));
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.formatEntry(this.data.agent, languageContext);
  }

  private formatEntry(entry: TestsPromptEntry, languageContext: string): string {
    const sections = [
      entry.role,
      languageContext,
      this.formatInstructions(entry.instructions),
    ];

    if (entry.examples.length > 0) {
      sections.push(this.formatExamples(entry.examples));
    }

    return sections.join("\n\n");
  }

  private formatInstructions(instructions: string[]): string {
    return [
      "Instrucoes:",
      ...instructions.map((instruction) => `- ${instruction}`),
    ].join("\n");
  }

  private formatExamples(examples: TestsPromptEntry["examples"]): string {
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
