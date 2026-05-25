import type { ReviewResponse } from "@shared";

export type ReviewWebhookSuccessPayload = {
  flow_type: "review";
  execution_id: string;
  status: "success";
  cache_hit: boolean;
  output: ReviewResponse;
};

export type ReviewWebhookFailedPayload = {
  flow_type: "review";
  execution_id: string;
  status: "failed";
  cache_hit: false;
  error_message: string;
};

export type ReviewWebhookPayload = ReviewWebhookSuccessPayload | ReviewWebhookFailedPayload;

export interface ReviewWebhookNotifier {
  notify(payload: ReviewWebhookPayload): Promise<void>;
}

export type WebhookFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
}>;

export class HttpReviewWebhookNotifier implements ReviewWebhookNotifier {
  constructor(
    private readonly callbackUrl: string,
    private readonly fetchFn: WebhookFetch = fetch,
  ) {}

  async notify(payload: ReviewWebhookPayload): Promise<void> {
    const response = await this.fetchFn(this.callbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook callback retornou HTTP ${response.status} ${response.statusText}.`);
    }
  }
}

export class NoopReviewWebhookNotifier implements ReviewWebhookNotifier {
  async notify(_payload: ReviewWebhookPayload): Promise<void> {
    void _payload;
  }
}
