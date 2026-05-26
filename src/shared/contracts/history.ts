import { z } from "zod";
import { executionFlowTypeSchema } from "./flow-types";

const nonEmptyString = z.string().trim().min(1);
const nullableNumber = z.number().nullable();
const dateString = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Data invalida.",
});
const queryBoolean = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean());

export const historyListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: nonEmptyString.optional(),
  flow_type: executionFlowTypeSchema.optional(),
  status: z.enum(["pending", "success", "failed"]).optional(),
  model: nonEmptyString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  cache_hit: queryBoolean.optional(),
});
export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;

export const historyTelemetrySchema = z.object({
  provider: nonEmptyString,
  model_requested: nonEmptyString,
  model_used: z.string().nullable(),
  openrouter_generation_id: z.string().nullable(),
  prompt_tokens: nullableNumber,
  completion_tokens: nullableNumber,
  total_tokens: nullableNumber,
  cost_total_usd: nullableNumber,
  cost_input_usd: nullableNumber,
  cost_output_usd: nullableNumber,
  cache_read_tokens: nullableNumber,
});
export type HistoryTelemetry = z.infer<typeof historyTelemetrySchema>;

export const historyStepSchema = z.object({
  id: nonEmptyString,
  timestamp: nonEmptyString,
  node_name: nonEmptyString,
  kind: z.string().trim().min(1),
  status: z.enum(["pending", "success", "failed"]),
  duration_ms: z.number().int().min(0),
  input_payload: z.unknown().nullable(),
  output_payload: z.unknown().nullable(),
  error_message: z.string().nullable(),
});
export type HistoryStep = z.infer<typeof historyStepSchema>;

export const historyStepSummarySchema = z.object({
  node_name: nonEmptyString,
  kind: z.string().trim().min(1),
  status: z.enum(["pending", "success", "failed"]),
  duration_ms: z.number().int().min(0),
});
export type HistoryStepSummary = z.infer<typeof historyStepSummarySchema>;

export const historyListItemSchema = z.object({
  id: nonEmptyString,
  type: z.string().trim().min(1),
  status: z.enum(["pending", "success", "failed"]),
  timestamp: nonEmptyString,
  duration_ms: z.number().int().min(0),
  cache_hit: z.boolean(),
  source_execution_id: z.string().nullable(),
  telemetry: historyTelemetrySchema.nullable(),
  steps: z.array(historyStepSummarySchema),
});
export type HistoryListItem = z.infer<typeof historyListItemSchema>;

export const historyListResponseSchema = z.object({
  items: z.array(historyListItemSchema),
  page: z.object({
    limit: z.number().int().min(1),
    next_cursor: z.string().nullable(),
  }),
});
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;

export const historyDetailSchema = historyListItemSchema.extend({
  input_payload: z.unknown(),
  output_payload: z.unknown().nullable(),
  error_message: z.string().nullable(),
  steps: z.array(historyStepSchema),
});
export type HistoryDetail = z.infer<typeof historyDetailSchema>;

export const historyDetailParamsSchema = z.object({
  id: nonEmptyString,
});
export type HistoryDetailParams = z.infer<typeof historyDetailParamsSchema>;
