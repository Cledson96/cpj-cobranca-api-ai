import { z } from "zod";

const nonEmptyString = () => z.string().trim().min(1);
const positiveInt = () => z.coerce.number().int().min(1);

export const promptFlowTypeSchema = z.enum(["review", "compliance", "document", "tests"]);
export type PromptFlowType = z.infer<typeof promptFlowTypeSchema>;

export const promptBlockKeySchema = z.enum([
  "agent",
  "aggregator",
  "naming_clarity",
  "error_handling",
  "resource_leak",
  "complexity",
  "security",
]);
export type PromptBlockKey = z.infer<typeof promptBlockKeySchema>;

export const promptVersionParamsSchema = z.object({
  flowType: promptFlowTypeSchema,
  version: positiveInt(),
});
export type PromptVersionParams = z.infer<typeof promptVersionParamsSchema>;

export const promptFlowParamsSchema = z.object({
  flowType: promptFlowTypeSchema,
});
export type PromptFlowParams = z.infer<typeof promptFlowParamsSchema>;

export const promptVersionListQuerySchema = z.object({
  flow_type: promptFlowTypeSchema,
});
export type PromptVersionListQuery = z.infer<typeof promptVersionListQuerySchema>;

export const promptBlockSchema = z.object({
  block_key: promptBlockKeySchema,
  system_prompt: nonEmptyString(),
});
export type PromptBlock = z.infer<typeof promptBlockSchema>;

export const promptVersionSummarySchema = z.object({
  flow_type: promptFlowTypeSchema,
  version: z.number().int().min(1),
  name: nonEmptyString(),
  is_active: z.boolean(),
  block_keys: z.array(promptBlockKeySchema).min(1),
});
export type PromptVersionSummary = z.infer<typeof promptVersionSummarySchema>;

export const promptVersionDetailSchema = promptVersionSummarySchema.extend({
  blocks: z.array(promptBlockSchema).min(1),
});
export type PromptVersionDetail = z.infer<typeof promptVersionDetailSchema>;

export const promptVersionListResponseSchema = z.object({
  items: z.array(promptVersionSummarySchema),
});
export type PromptVersionListResponse = z.infer<typeof promptVersionListResponseSchema>;

export const promptVersionCreateRequestSchema = z.object({
  flow_type: promptFlowTypeSchema,
  name: nonEmptyString(),
  blocks: z.array(promptBlockSchema).min(1),
});
export type PromptVersionCreateRequest = z.infer<typeof promptVersionCreateRequestSchema>;

export const promptVersionActivateParamsSchema = promptVersionParamsSchema;
export type PromptVersionActivateParams = z.infer<typeof promptVersionActivateParamsSchema>;
