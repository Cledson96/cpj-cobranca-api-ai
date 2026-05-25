import { z } from "zod";
import { supportedLanguageSchema } from "./flow-types";

const nonEmptyString = () => z.string().trim().min(1);

export const documentDocTypeSchema = z.enum(["technical", "operational"]);
export type DocumentDocType = z.infer<typeof documentDocTypeSchema>;

export const documentRequestSchema = z.object({
  code: nonEmptyString(),
  language: supportedLanguageSchema,
  doc_type: documentDocTypeSchema,
  prompt_version: z.number().int().min(1).optional(),
  model: nonEmptyString().optional(),
});
export type DocumentRequest = z.infer<typeof documentRequestSchema>;

const createDocumentIoItemSchema = () => z.object({
  name: nonEmptyString(),
  type: nonEmptyString(),
  description: nonEmptyString(),
});

export const documentInputItemSchema = createDocumentIoItemSchema();
export const documentOutputItemSchema = createDocumentIoItemSchema();
export const documentIoItemSchema = createDocumentIoItemSchema();
export type DocumentIoItem = z.infer<typeof documentIoItemSchema>;

export const documentResponseSchema = z.object({
  doc_type: documentDocTypeSchema,
  title: nonEmptyString(),
  description: nonEmptyString(),
  inputs: z.array(documentInputItemSchema),
  outputs: z.array(documentOutputItemSchema),
  side_effects: z.array(nonEmptyString()),
  usage_example: nonEmptyString(),
  notes: z.string().trim().min(1).nullable(),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
