import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = () => z.string().trim().min(1);

export const complianceRequestSchema = z.object({
  task_description: nonEmptyString(),
  code: nonEmptyString(),
  language: supportedLanguageSchema,
  prompt_version: z.number().int().min(1).optional(),
  model: nonEmptyString().optional(),
});
export type ComplianceRequest = z.infer<typeof complianceRequestSchema>;

export const complianceResponseSchema = z.object({
  compliant: z.boolean(),
  compliance_score: z.number().int().min(0).max(100),
  covered_requirements: z.array(nonEmptyString()),
  missing_requirements: z.array(nonEmptyString()),
  partial_requirements: z.array(nonEmptyString()),
  verdict: nonEmptyString(),
});
export type ComplianceResponse = z.infer<typeof complianceResponseSchema>;
