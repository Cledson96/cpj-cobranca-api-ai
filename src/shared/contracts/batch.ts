import { z } from "zod";
import { complianceRequestSchema } from "./compliance";
import { documentRequestSchema } from "./document";
import { reviewRequestSchema } from "./review";
import { testsRequestSchema } from "./tests";

export const batchItemFlowTypeSchema = z.enum(["review", "compliance", "document", "tests"]);
export type BatchItemFlowType = z.infer<typeof batchItemFlowTypeSchema>;

export const batchItemSchema = z.discriminatedUnion("flow_type", [
  z.object({
    flow_type: z.literal("review"),
    payload: reviewRequestSchema,
  }),
  z.object({
    flow_type: z.literal("compliance"),
    payload: complianceRequestSchema,
  }),
  z.object({
    flow_type: z.literal("document"),
    payload: documentRequestSchema,
  }),
  z.object({
    flow_type: z.literal("tests"),
    payload: testsRequestSchema,
  }),
]);
export type BatchItem = z.infer<typeof batchItemSchema>;

export const batchRequestSchema = z.object({
  items: z.array(batchItemSchema).min(1),
  continue_on_error: z.boolean().default(true),
  notify: z.boolean().default(false),
});
export type BatchRequest = z.input<typeof batchRequestSchema>;

export const batchResultSchema = z.object({
  index: z.number().int().min(0),
  flow_type: batchItemFlowTypeSchema,
  execution_id: z.string().nullable(),
  status: z.enum(["success", "failed"]),
  cache_hit: z.boolean().nullable(),
  output: z.unknown().nullable(),
  error_message: z.string().nullable(),
});
export type BatchResult = z.infer<typeof batchResultSchema>;

export const batchResponseSchema = z.object({
  batch_id: z.string().trim().min(1),
  status: z.enum(["success", "partial", "failed"]),
  results: z.array(batchResultSchema),
});
export type BatchResponse = z.infer<typeof batchResponseSchema>;
