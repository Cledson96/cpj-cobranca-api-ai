import { z } from "zod";
import { executionFlowTypeSchema } from "./flow-types";

const nonEmptyString = z.string().trim().min(1);
const nonNegativeNumber = z.number().min(0);
const dateString = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Data invalida.",
});

export const analyticsUsageQuerySchema = z.object({
  flow_type: executionFlowTypeSchema.optional(),
  model: nonEmptyString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});
export type AnalyticsUsageQuery = z.infer<typeof analyticsUsageQuerySchema>;

const analyticsBucketSchema = z.object({
  executions: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
  cost_total_usd: nonNegativeNumber,
});

export const analyticsUsageResponseSchema = z.object({
  totals: z.object({
    executions: z.number().int().min(0),
    successful: z.number().int().min(0),
    failed: z.number().int().min(0),
    cache_hits: z.number().int().min(0),
    prompt_tokens: z.number().int().min(0),
    completion_tokens: z.number().int().min(0),
    total_tokens: z.number().int().min(0),
    cache_read_tokens: z.number().int().min(0),
    cost_total_usd: nonNegativeNumber,
    cost_input_usd: nonNegativeNumber,
    cost_output_usd: nonNegativeNumber,
    average_duration_ms: z.number().int().min(0),
  }),
  by_day: z.array(analyticsBucketSchema.extend({
    date: nonEmptyString,
  })),
  by_flow: z.array(analyticsBucketSchema.extend({
    flow_type: executionFlowTypeSchema,
  })),
  by_model: z.array(analyticsBucketSchema.extend({
    model: nonEmptyString,
  })),
});
export type AnalyticsUsageResponse = z.infer<typeof analyticsUsageResponseSchema>;
