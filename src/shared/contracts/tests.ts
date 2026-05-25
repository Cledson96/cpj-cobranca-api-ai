import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = () => z.string().trim().min(1);
const executableTestFile = () => z.string().trim().min(80);

export const testsFrameworkSchema = nonEmptyString();
export type TestsFramework = z.infer<typeof testsFrameworkSchema>;

export const testsRequestSchema = z.object({
  code: nonEmptyString(),
  language: supportedLanguageSchema,
  test_framework: testsFrameworkSchema,
});
export type TestsRequest = z.infer<typeof testsRequestSchema>;

export const generatedTestCaseTypeSchema = z.enum(["happy_path", "edge_case", "error_case"]);
export type GeneratedTestCaseType = z.infer<typeof generatedTestCaseTypeSchema>;

export const generatedTestCaseSchema = z.object({
  name: nonEmptyString(),
  type: generatedTestCaseTypeSchema,
  description: nonEmptyString(),
});
export type GeneratedTestCase = z.infer<typeof generatedTestCaseSchema>;

export const testsResponseSchema = z.object({
  framework: testsFrameworkSchema,
  test_file: executableTestFile(),
  test_cases: z.array(generatedTestCaseSchema),
  coverage_hints: z.array(nonEmptyString()),
});
export type TestsResponse = z.infer<typeof testsResponseSchema>;
