import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const historyListItemSchema = z.object({
  id: nonEmptyString,
  type: z.string().trim().min(1),
  status: z.enum(["pending", "success", "failed"]),
  timestamp: nonEmptyString,
  duration_ms: z.number().int().min(0),
  cache_hit: z.boolean(),
  source_execution_id: z.string().nullable(),
});
export type HistoryListItem = z.infer<typeof historyListItemSchema>;

export const historyListResponseSchema = z.object({
  items: z.array(historyListItemSchema),
});
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;

export const historyDetailSchema = historyListItemSchema.extend({
  input_payload: z.unknown(),
  output_payload: z.unknown().nullable(),
  error_message: z.string().nullable(),
});
export type HistoryDetail = z.infer<typeof historyDetailSchema>;

export const historyDetailParamsSchema = z.object({
  id: nonEmptyString,
});
export type HistoryDetailParams = z.infer<typeof historyDetailParamsSchema>;
