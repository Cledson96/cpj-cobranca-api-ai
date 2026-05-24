import { z } from "zod";

export const flowTypeSchema = z.enum(["review"]);
export type FlowType = z.infer<typeof flowTypeSchema>;

export const supportedLanguageSchema = z.enum(["typescript", "javascript", "python"]);
export type SupportedLanguage = z.infer<typeof supportedLanguageSchema>;
