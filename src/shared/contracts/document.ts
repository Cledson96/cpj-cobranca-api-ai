import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = () => z.string().trim().min(1);

export const documentAudienceSchema = z.enum(["developer", "support", "business"]);
export type DocumentAudience = z.infer<typeof documentAudienceSchema>;

export const documentDetailLevelSchema = z.enum(["summary", "standard", "detailed"]);
export type DocumentDetailLevel = z.infer<typeof documentDetailLevelSchema>;

export const documentRequestSchema = z.object({
  code: nonEmptyString(),
  language: supportedLanguageSchema,
  title: z.string().trim().optional(),
  audience: documentAudienceSchema.default("developer"),
  detail_level: documentDetailLevelSchema.default("standard"),
});
export type DocumentRequest = z.input<typeof documentRequestSchema>;

export const documentPublicApiItemSchema = z.object({
  name: nonEmptyString(),
  kind: nonEmptyString(),
  description: nonEmptyString(),
});
export type DocumentPublicApiItem = z.infer<typeof documentPublicApiItemSchema>;

export const documentResponseSchema = z.object({
  title: nonEmptyString(),
  summary: nonEmptyString(),
  documentation: nonEmptyString(),
  public_api: z.array(documentPublicApiItemSchema),
  examples: z.array(nonEmptyString()),
  gaps: z.array(nonEmptyString()),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
