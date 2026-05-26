export type ExecutionFlowType =
  | "review"
  | "compliance"
  | "document"
  | "tests"
  | "batch"
  | "pull_request_review";

export type ExecutionStatus = "pending" | "success" | "failed";

export type Telemetry = {
  provider: string;
  model_requested: string;
  model_used: string | null;
  openrouter_generation_id: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_total_usd: number | null;
  cost_input_usd: number | null;
  cost_output_usd: number | null;
  cache_read_tokens: number | null;
};

export type HistoryStepSummary = {
  node_name: string;
  kind: string;
  status: ExecutionStatus;
  duration_ms: number;
};

export type HistoryStep = HistoryStepSummary & {
  id: string;
  timestamp: string;
  input_payload: unknown | null;
  output_payload: unknown | null;
  error_message: string | null;
};

export type HistoryItem = {
  id: string;
  type: ExecutionFlowType;
  status: ExecutionStatus;
  timestamp: string;
  duration_ms: number;
  cache_hit: boolean;
  source_execution_id: string | null;
  telemetry: Telemetry | null;
  steps: HistoryStepSummary[];
};

export type HistoryDetail = HistoryItem & {
  input_payload: unknown;
  output_payload: unknown | null;
  error_message: string | null;
  steps: HistoryStep[];
};

export type HistoryListQuery = {
  limit?: number;
  cursor?: string;
  flow_type?: ExecutionFlowType;
  status?: ExecutionStatus;
  model?: string;
  from?: string;
  to?: string;
  cache_hit?: boolean;
};

export type HistoryListResponse = {
  items: HistoryItem[];
  page: {
    limit: number;
    next_cursor: string | null;
  };
};

export type UsageResponse = {
  totals: {
    executions: number;
    successful: number;
    failed: number;
    cache_hits: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cache_read_tokens: number;
    cost_total_usd: number;
    cost_input_usd: number;
    cost_output_usd: number;
    average_duration_ms: number;
  };
  by_day: Array<{
    date: string;
    executions: number;
    total_tokens: number;
    cost_total_usd: number;
  }>;
  by_flow: Array<{
    flow_type: ExecutionFlowType;
    executions: number;
    total_tokens: number;
    cost_total_usd: number;
  }>;
  by_model: Array<{
    model: string;
    executions: number;
    total_tokens: number;
    cost_total_usd: number;
  }>;
};

export type PromptFlowType = "review" | "compliance" | "document" | "tests" | "pull_request_review";
export type PromptBlockKey =
  | "agent"
  | "aggregator"
  | "naming_clarity"
  | "error_handling"
  | "resource_leak"
  | "complexity"
  | "security"
  | "code_standard"
  | "jira_criteria"
  | "project_consistency";

export type PromptSummary = {
  flow_type: PromptFlowType;
  version: number;
  name: string;
  is_active: boolean;
  block_keys: PromptBlockKey[];
};

export type PromptDetail = PromptSummary & {
  blocks: Array<{
    block_key: PromptBlockKey;
    system_prompt: string;
  }>;
};

export type ModelDetail = {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
};

export type Language = "typescript" | "javascript" | "python" | "php";
