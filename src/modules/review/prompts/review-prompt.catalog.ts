import { z } from "zod";
import promptData from "./review-prompts.json";

const LANGUAGE_CONTEXT_PLACEHOLDER = "{{language_context}}";

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
type ReviewPromptTemplates = {
  specialists: Record<SpecialistPromptKey, string>;
  aggregator: string;
};

export class ReviewPromptCatalog {
  private constructor(private readonly templates: ReviewPromptTemplates) {}

  static default(): ReviewPromptCatalog {
    const parsed = reviewPromptCatalogSchema.parse(promptData);
    return new ReviewPromptCatalog(this.createTemplates(parsed));
  }

  static fromTemplates(templates: ReviewPromptTemplates): ReviewPromptCatalog {
    return new ReviewPromptCatalog(templates);
  }

  static defaultTemplates(): ReviewPromptTemplates {
    const parsed = reviewPromptCatalogSchema.parse(promptData);
    return this.createTemplates(parsed);
  }

  getSpecialistSystemPrompt(
    promptKey: SpecialistPromptKey,
    languageContext: string,
  ): string {
    const template = this.templates.specialists[promptKey];
    if (!template) {
      throw new Error(`Prompt de especialista nao encontrado: ${promptKey}`);
    }

    return template.replace(LANGUAGE_CONTEXT_PLACEHOLDER, languageContext);
  }

  getAggregatorSystemPrompt(languageContext: string): string {
    return this.templates.aggregator.replace(LANGUAGE_CONTEXT_PLACEHOLDER, languageContext);
  }

  private static createTemplates(data: ReviewPromptCatalogData): ReviewPromptTemplates {
    const specialists = data.specialists as Record<SpecialistPromptKey, ReviewPromptEntry>;

    return {
      specialists: {
        naming_clarity: this.createTemplate(specialists.naming_clarity),
        error_handling: this.createTemplate(specialists.error_handling),
        resource_leak: this.createTemplate(specialists.resource_leak),
        complexity: this.createTemplate(specialists.complexity),
        security: this.createTemplate(specialists.security),
      },
      aggregator: this.createTemplate(data.aggregator),
    };
  }

  private static createTemplate(entry: ReviewPromptEntry): string {
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

  private static formatExamples(examples: ReviewPromptEntry["examples"]): string {
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
