import type {
  HistoryDetail,
  HistoryListQuery,
  HistoryListResponse,
  Language,
  ModelDetail,
  PromptBlockKey,
  PromptDetail,
  PromptFlowType,
  PromptSummary,
  UsageResponse,
} from "./types";

type QueryValue = string | number | boolean | null | undefined;

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

export function buildQueryString(input: Record<string, QueryValue> = {}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const output = params.toString();
  return output ? `?${output}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await safeJson(response);
    const message = typeof body === "object" && body !== null && "message" in body
      ? String(body.message)
      : `Falha HTTP ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export type PromptCreatePayload = {
  flow_type: PromptFlowType;
  name: string;
  blocks: Array<{
    block_key: PromptBlockKey;
    system_prompt: string;
  }>;
};

export type ModelCreatePayload = {
  name: string;
};

export type ModelUpdatePayload = {
  name?: string;
  is_active?: boolean;
  is_default?: boolean;
};

export type ReviewPayload = {
  code: string;
  language: Language;
  context?: string;
  prompt_version?: number;
  model?: string;
};

export const api = {
  getUsage(query: Partial<HistoryListQuery> = {}) {
    return request<UsageResponse>(`/api/v1/analytics/usage${buildQueryString(query)}`);
  },

  listHistory(query: HistoryListQuery = { limit: 20 }) {
    return request<HistoryListResponse>(`/api/v1/history${buildQueryString(query)}`);
  },

  getHistoryDetail(id: string) {
    return request<HistoryDetail>(`/api/v1/history/${encodeURIComponent(id)}`);
  },

  listPrompts(flowType: PromptFlowType) {
    return request<{ items: PromptSummary[] }>(`/api/v1/prompts${buildQueryString({ flow_type: flowType })}`);
  },

  getActivePrompt(flowType: PromptFlowType) {
    return request<PromptDetail>(`/api/v1/prompts/${flowType}/active`);
  },

  createPrompt(payload: PromptCreatePayload) {
    return request<PromptDetail>("/api/v1/prompts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  activatePrompt(flowType: PromptFlowType, version: number) {
    return request<PromptDetail>(`/api/v1/prompts/${flowType}/${version}/activate`, {
      method: "POST",
    });
  },

  listModels() {
    return request<{ items: ModelDetail[] }>("/api/v1/models");
  },

  createModel(payload: ModelCreatePayload) {
    return request<ModelDetail>("/api/v1/models", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateModel(id: string, payload: ModelUpdatePayload) {
    return request<ModelDetail>(`/api/v1/models/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteModel(id: string) {
    return request<void>(`/api/v1/models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  health() {
    return request<{ status: string }>("/health");
  },

  runReview(payload: ReviewPayload) {
    return request<unknown>("/api/v1/review", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runCompliance(payload: unknown) {
    return request<unknown>("/api/v1/compliance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runDocument(payload: unknown) {
    return request<unknown>("/api/v1/document", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runTests(payload: unknown) {
    return request<unknown>("/api/v1/tests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runPullRequestReview(payload: unknown) {
    return request<unknown>("/api/v1/review/pull-request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runPullRequestTests(payload: unknown) {
    return request<unknown>("/api/v1/tests/pull-request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runBatch(payload: unknown) {
    return request<unknown>("/api/v1/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
