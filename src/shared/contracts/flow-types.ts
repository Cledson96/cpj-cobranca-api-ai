import { z } from "zod";

export const flowTypeSchema = z.enum(["review", "compliance", "document", "tests", "batch"]);
export type FlowType = z.infer<typeof flowTypeSchema>;

export const executionFlowTypeSchema = z.enum([
  "review",
  "compliance",
  "document",
  "tests",
  "batch",
  "pull_request_review",
]);
export type ExecutionFlowType = z.infer<typeof executionFlowTypeSchema>;

export const supportedLanguageSchema = z.enum(["typescript", "javascript", "python", "php"]);
export type SupportedLanguage = z.infer<typeof supportedLanguageSchema>;
