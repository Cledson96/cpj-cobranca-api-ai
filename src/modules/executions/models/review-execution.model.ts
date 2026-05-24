import type { ReviewRequest, ReviewResponse } from "@shared";

export type ExecutionStatus = "pending" | "success" | "failed";
export type ReviewFlowType = "review";

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
};

export type PrismaExecutionDelegate = {
  create(input: unknown): Promise<ReviewExecutionRecord>;
  update(input: unknown): Promise<ReviewExecutionRecord>;
  findUnique(input: unknown): Promise<ReviewExecutionRecord | null>;
  findMany(input: unknown): Promise<ReviewExecutionRecord[]>;
};

export type ReviewExecutionRepositoryPrisma = {
  execution: PrismaExecutionDelegate;
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

export type ReviewExecution = {
  id: string;
  type: ReviewFlowType;
  status: ExecutionStatus;
  timestamp: string;
  duration_ms: number;
  cache_hit: boolean;
  source_execution_id: string | null;
  input_payload: unknown;
  output_payload: unknown | null;
  error_message: string | null;
};

export type ReviewExecutionListItem = Omit<
  ReviewExecution,
  "input_payload" | "output_payload" | "error_message"
>;
