import { z } from "zod";
import promptData from "./compliance-prompts.json";

const LANGUAGE_CONTEXT_PLACEHOLDER = "{{language_context}}";

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

type CompliancePromptEntry = z.infer<typeof compliancePromptEntrySchema>;

export class CompliancePromptCatalog {
  private constructor(private readonly agentTemplate: string) {}

  static default(): CompliancePromptCatalog {
    const parsed = compliancePromptCatalogSchema.parse(promptData);
    return new CompliancePromptCatalog(this.createTemplate(parsed.agent));
  }

  static fromTemplate(agentTemplate: string): CompliancePromptCatalog {
    return new CompliancePromptCatalog(agentTemplate);
  }

  static defaultTemplate(): string {
    const parsed = compliancePromptCatalogSchema.parse(promptData);
    return this.createTemplate(parsed.agent);
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.agentTemplate.replace(LANGUAGE_CONTEXT_PLACEHOLDER, languageContext);
  }

  private static createTemplate(entry: CompliancePromptEntry): string {
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

  private static formatExamples(examples: CompliancePromptEntry["examples"]): string {
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
