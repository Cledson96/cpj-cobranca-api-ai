import { toSaoPauloIso } from "@shared";
import type {
  AnalyticsUsageQuery,
  AnalyticsUsageResponse,
  ExecutionFlowType,
} from "@shared";
import type { ExecutionStatus } from "@/modules/executions";

type UsageTelemetryRecord = {
  modelRequested: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: unknown;
  inputCostUsd?: unknown;
  outputCostUsd?: unknown;
  cacheReadTokens?: number | null;
};

export type AnalyticsUsageRecord = {
  id: string;
  createdAt: Date | string;
  flowType: ExecutionFlowType;
  status: ExecutionStatus;
  durationMs: number;
  cacheHit: boolean;
  telemetry?: UsageTelemetryRecord | null;
};

export type AnalyticsRepository = {
  listUsageRecords(input: AnalyticsUsageQuery): Promise<AnalyticsUsageRecord[]>;
};

export interface AnalyticsService {
  getUsage(input: AnalyticsUsageQuery): Promise<AnalyticsUsageResponse>;
}

type Bucket = {
  executions: number;
  total_tokens: number;
  cost_total_usd: number;
};

export class DefaultAnalyticsService implements AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getUsage(input: AnalyticsUsageQuery): Promise<AnalyticsUsageResponse> {
    const records = await this.repository.listUsageRecords(input);
    const byDay = new Map<string, Bucket>();
    const byFlow = new Map<ExecutionFlowType, Bucket>();
    const byModel = new Map<string, Bucket>();
    const totals = {
      executions: records.length,
      successful: 0,
      failed: 0,
      cache_hits: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cache_read_tokens: 0,
      cost_total_usd: 0,
      cost_input_usd: 0,
      cost_output_usd: 0,
      average_duration_ms: 0,
    };
    let totalDurationMs = 0;

    for (const record of records) {
      const telemetry = record.telemetry;
      const totalTokens = telemetry?.totalTokens ?? 0;
      const totalCost = toFiniteNumber(telemetry?.costUsd);
      const day = toSaoPauloIso(record.createdAt).slice(0, 10);
      const model = telemetry?.modelRequested ?? "unknown";

      totals.successful += record.status === "success" ? 1 : 0;
      totals.failed += record.status === "failed" ? 1 : 0;
      totals.cache_hits += record.cacheHit ? 1 : 0;
      totals.prompt_tokens += telemetry?.promptTokens ?? 0;
      totals.completion_tokens += telemetry?.completionTokens ?? 0;
      totals.total_tokens += totalTokens;
      totals.cache_read_tokens += telemetry?.cacheReadTokens ?? 0;
      totals.cost_total_usd += totalCost;
      totals.cost_input_usd += toFiniteNumber(telemetry?.inputCostUsd);
      totals.cost_output_usd += toFiniteNumber(telemetry?.outputCostUsd);
      totalDurationMs += record.durationMs;

      incrementBucket(byDay, day, totalTokens, totalCost);
      incrementBucket(byFlow, record.flowType, totalTokens, totalCost);
      incrementBucket(byModel, model, totalTokens, totalCost);
    }

    totals.cost_total_usd = roundUsd(totals.cost_total_usd);
    totals.cost_input_usd = roundUsd(totals.cost_input_usd);
    totals.cost_output_usd = roundUsd(totals.cost_output_usd);
    totals.average_duration_ms = records.length > 0 ? Math.round(totalDurationMs / records.length) : 0;

    return {
      totals,
      by_day: Array.from(byDay.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([date, bucket]) => ({
        date,
        ...normalizeBucket(bucket),
      })),
      by_flow: Array.from(byFlow.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([flow_type, bucket]) => ({
        flow_type,
        ...normalizeBucket(bucket),
      })),
      by_model: Array.from(byModel.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([model, bucket]) => ({
        model,
        ...normalizeBucket(bucket),
      })),
    };
  }
}

function incrementBucket<TKey>(map: Map<TKey, Bucket>, key: TKey, totalTokens: number, totalCost: number): void {
  const current = map.get(key) ?? {
    executions: 0,
    total_tokens: 0,
    cost_total_usd: 0,
  };

  current.executions += 1;
  current.total_tokens += totalTokens;
  current.cost_total_usd += totalCost;
  map.set(key, current);
}

function normalizeBucket(bucket: Bucket): Bucket {
  return {
    executions: bucket.executions,
    total_tokens: bucket.total_tokens,
    cost_total_usd: roundUsd(bucket.cost_total_usd),
  };
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && value !== null) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(8));
}
