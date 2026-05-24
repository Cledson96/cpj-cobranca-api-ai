import type { ReviewRequest, ReviewResponse } from "@shared";

export type ExecutionStatus = "pending" | "success" | "failed";
export type ReviewFlowType = "review" | "compliance" | "document" | "tests" | "batch";
export type ExecutionStepKind =
  | "system"
  | "tool"
  | "prompt"
  | "llm"
  | "parser"
  | "persistence"
  | "webhook"
  | "cache";

export type ReviewExecutionTelemetryRecord = {
  provider: string;
  modelRequested: string;
  modelUsed?: string | null;
  langsmithRunId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: unknown;
  inputCostUsd?: unknown;
  outputCostUsd?: unknown;
  cacheReadTokens?: number | null;
};

export type ReviewExecutionStepRecord = {
  id: string;
  executionId: string;
  createdAt: Date | string;
  nodeName: string;
  kind: ExecutionStepKind;
  status: ExecutionStatus;
  inputPayload?: unknown;
  outputPayload?: unknown;
  durationMs: number;
  errorMessage?: string | null;
};

export type ReviewExecutionRecord = {
  id: string;
  createdAt: Date | string;
  flowType: ReviewFlowType;
  status: ExecutionStatus;
  inputPayload?: unknown;
  outputPayload?: unknown;
  durationMs: number;
  requestHash?: string;
  cacheHit: boolean;
  sourceExecutionId: string | null;
  errorMessage?: string | null;
  telemetry?: ReviewExecutionTelemetryRecord | null;
  steps?: ReviewExecutionStepRecord[];
};

export type PrismaExecutionDelegate = {
  create(input: unknown): Promise<ReviewExecutionRecord>;
  update(input: unknown): Promise<ReviewExecutionRecord>;
  findUnique(input: unknown): Promise<ReviewExecutionRecord | null>;
  findMany(input: unknown): Promise<ReviewExecutionRecord[]>;
};

export type PrismaExecutionStepDelegate = {
  create(input: unknown): Promise<unknown>;
};

export type PrismaExecutionTelemetryDelegate = {
  upsert(input: unknown): Promise<unknown>;
};

export type ReviewExecutionRepositoryPrisma = {
  execution: PrismaExecutionDelegate;
  executionStep: PrismaExecutionStepDelegate;
  executionTelemetry: PrismaExecutionTelemetryDelegate;
};

export type CreatePendingReviewExecutionInput = {
  inputPayload: ReviewRequest;
  requestHash: string;
};

export type MarkReviewExecutionSuccessInput = {
  id: string;
  outputPayload: ReviewResponse;
  durationMs: number;
};

export type MarkReviewExecutionFailedInput = {
  id: string;
  errorMessage: string;
  durationMs: number;
};

export type RecordReviewExecutionStepInput = {
  executionId: string;
  nodeName: string;
  kind: ExecutionStepKind;
  status: ExecutionStatus;
  inputPayload?: unknown;
  outputPayload?: unknown;
  durationMs: number;
  errorMessage?: string | null;
};

export type RecordReviewExecutionTelemetryInput = {
  executionId: string;
  provider: string;
  modelRequested: string;
  modelUsed?: string | null;
  langsmithRunId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: string | null;
  inputCostUsd?: string | null;
  outputCostUsd?: string | null;
  cacheReadTokens?: number | null;
};

export type ReviewExecutionTelemetry = {
  provider: string;
  model_requested: string;
  model_used: string | null;
  langsmith_run_id: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_total_usd: number | null;
  cost_input_usd: number | null;
  cost_output_usd: number | null;
  cache_read_tokens: number | null;
};

export type ReviewExecutionStep = {
  id: string;
  timestamp: string;
  node_name: string;
  kind: ExecutionStepKind;
  status: ExecutionStatus;
  duration_ms: number;
  input_payload: unknown | null;
  output_payload: unknown | null;
  error_message: string | null;
};

export type ReviewExecution = {
  id: string;
  type: ReviewFlowType;
  status: ExecutionStatus;
  timestamp: string;
  duration_ms: number;
  cache_hit: boolean;
  source_execution_id: string | null;
  telemetry: ReviewExecutionTelemetry | null;
  input_payload: unknown;
  output_payload: unknown | null;
  error_message: string | null;
  steps: ReviewExecutionStep[];
};

export type ReviewExecutionListItem = Omit<
  ReviewExecution,
  "input_payload" | "output_payload" | "error_message" | "steps"
>;
