import { z } from "zod";
import promptData from "./document-prompts.json";

const LANGUAGE_CONTEXT_PLACEHOLDER = "{{language_context}}";

const documentPromptExampleSchema = z.object({
  title: z.string().trim().min(1),
  input: z.string().trim().min(1),
  expected: z.string().trim().min(1),
});

const documentPromptEntrySchema = z.object({
  role: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  examples: z.array(documentPromptExampleSchema).default([]),
});

const documentPromptCatalogSchema = z.object({
  agent: documentPromptEntrySchema,
});

type DocumentPromptEntry = z.infer<typeof documentPromptEntrySchema>;

export class DocumentPromptCatalog {
  private constructor(private readonly agentTemplate: string) {}

  static default(): DocumentPromptCatalog {
    const parsed = documentPromptCatalogSchema.parse(promptData);
    return new DocumentPromptCatalog(this.createTemplate(parsed.agent));
  }

  static fromTemplate(agentTemplate: string): DocumentPromptCatalog {
    return new DocumentPromptCatalog(agentTemplate);
  }

  static defaultTemplate(): string {
    const parsed = documentPromptCatalogSchema.parse(promptData);
    return this.createTemplate(parsed.agent);
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.agentTemplate.replace(LANGUAGE_CONTEXT_PLACEHOLDER, languageContext);
  }

  private static createTemplate(entry: DocumentPromptEntry): string {
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

  private static formatExamples(examples: DocumentPromptEntry["examples"]): string {
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
