import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = () => z.string().trim().min(1);

export const testsFrameworkSchema = z.enum(["auto", "vitest", "jest", "pytest", "phpunit"]);
export type TestsFramework = z.infer<typeof testsFrameworkSchema>;

export const testsRequestSchema = z.object({
  code: nonEmptyString(),
  language: supportedLanguageSchema,
  framework: testsFrameworkSchema.default("auto"),
  test_goal: z.string().trim().optional(),
  include_mocks: z.boolean().default(true),
});
export type TestsRequest = z.input<typeof testsRequestSchema>;

export const generatedTestCaseSchema = z.object({
  name: nonEmptyString(),
  kind: z.enum(["unit", "integration", "edge", "error"]),
  description: nonEmptyString(),
  assertions: z.array(nonEmptyString()).min(1),
});
export type GeneratedTestCase = z.infer<typeof generatedTestCaseSchema>;

export const testsResponseSchema = z.object({
  framework: testsFrameworkSchema,
  strategy_summary: nonEmptyString(),
  test_cases: z.array(generatedTestCaseSchema),
  test_code: nonEmptyString(),
  gaps: z.array(nonEmptyString()),
});
export type TestsResponse = z.infer<typeof testsResponseSchema>;
