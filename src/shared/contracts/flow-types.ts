import { z } from "zod";

export const flowTypeSchema = z.enum(["review", "compliance", "document", "tests", "batch"]);
export type FlowType = z.infer<typeof flowTypeSchema>;

export const supportedLanguageSchema = z.enum(["typescript", "javascript", "python", "php"]);
export type SupportedLanguage = z.infer<typeof supportedLanguageSchema>;
