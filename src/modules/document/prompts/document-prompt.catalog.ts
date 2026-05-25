import { z } from "zod";
import promptData from "./document-prompts.json";

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

type DocumentPromptCatalogData = z.infer<typeof documentPromptCatalogSchema>;
type DocumentPromptEntry = z.infer<typeof documentPromptEntrySchema>;

export class DocumentPromptCatalog {
  private constructor(private readonly data: DocumentPromptCatalogData) {}

  static default(): DocumentPromptCatalog {
    return new DocumentPromptCatalog(documentPromptCatalogSchema.parse(promptData));
  }

  getAgentSystemPrompt(languageContext: string): string {
    return this.formatEntry(this.data.agent, languageContext);
  }

  private formatEntry(entry: DocumentPromptEntry, languageContext: string): string {
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

  private formatExamples(examples: DocumentPromptEntry["examples"]): string {
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
