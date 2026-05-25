import { randomUUID } from "node:crypto";
import type { BatchRequest, BatchResponse } from "@shared";

export interface BatchService {
  execute(input: BatchRequest): Promise<BatchResponse>;
}

export class DefaultBatchService implements BatchService {
  async execute(input: BatchRequest): Promise<BatchResponse> {
    return {
      batch_id: randomUUID(),
      status: "success",
      results: input.items.map((item, index) => ({
        index,
        flow_type: item.flow_type,
        execution_id: null,
        status: "success",
        cache_hit: null,
        output: null,
        error_message: null,
      })),
    };
  }
}
