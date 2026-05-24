import { z } from "zod";
import promptData from "./review-prompts.json";

const reviewPromptExampleSchema = z.object({
  title: z.string().trim().min(1),
  input: z.string().trim().min(1),
  expected: z.string().trim().min(1),
});

const reviewPromptEntrySchema = z.object({
  role: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  examples: z.array(reviewPromptExampleSchema).default([]),
});

export const specialistPromptKeySchema = z.enum([
  "naming_clarity",
  "error_handling",
  "resource_leak",
  "complexity",
  "security",
]);

export type SpecialistPromptKey = z.infer<typeof specialistPromptKeySchema>;

const reviewPromptCatalogSchema = z.object({
  specialists: z.record(specialistPromptKeySchema, reviewPromptEntrySchema),
  aggregator: reviewPromptEntrySchema,
});

type ReviewPromptCatalogData = z.infer<typeof reviewPromptCatalogSchema>;
type ReviewPromptEntry = z.infer<typeof reviewPromptEntrySchema>;

export class ReviewPromptCatalog {
  private constructor(private readonly data: ReviewPromptCatalogData) {}

  static default(): ReviewPromptCatalog {
    return new ReviewPromptCatalog(reviewPromptCatalogSchema.parse(promptData));
  }

  getSpecialistSystemPrompt(
    promptKey: SpecialistPromptKey,
    languageContext: string,
  ): string {
    const entry = this.data.specialists[promptKey];
    if (!entry) {
      throw new Error(`Prompt de especialista nao encontrado: ${promptKey}`);
    }

    return this.formatEntry(entry, languageContext);
  }

  getAggregatorSystemPrompt(languageContext: string): string {
    return this.formatEntry(this.data.aggregator, languageContext);
  }

  private formatEntry(entry: ReviewPromptEntry, languageContext: string): string {
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

  private formatExamples(examples: ReviewPromptEntry["examples"]): string {
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
