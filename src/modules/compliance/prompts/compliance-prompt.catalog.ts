import { z } from "zod";
import promptData from "./compliance-prompts.json";

const compliancePromptExampleSchema = z.object({
  title: z.string().trim().min(1),
  input: z.string().trim().min(1),
  expected: z.string().trim().min(1),
});

const compliancePromptEntrySchema = z.object({
  role: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  examples: z.array(compliancePromptExampleSchema).default([]),
});

const compliancePromptCatalogSchema = z.object({
  agent: compliancePromptEntrySchema,
});

type CompliancePromptCatalogData = z.infer<typeof compliancePromptCatalogSchema>;
type CompliancePromptEntry = z.infer<typeof compliancePromptEntrySchema>;

export class CompliancePromptCatalog {
  private constructor(private readonly data: CompliancePromptCatalogData) {}

  static default(): CompliancePromptCatalog {
    return new CompliancePromptCatalog(compliancePromptCatalogSchema.parse(promptData));
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.formatEntry(this.data.agent, languageContext);
  }

  private formatEntry(entry: CompliancePromptEntry, languageContext: string): string {
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

  private formatExamples(examples: CompliancePromptEntry["examples"]): string {
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
