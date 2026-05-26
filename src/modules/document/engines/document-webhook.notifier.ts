import { retryHttpOperation, type DocumentResponse } from "@shared";
import { GenericError } from "@/infrastructure/errors";

export type DocumentWebhookSuccessPayload = {
  flow_type: "document";
  execution_id: string;
  status: "success";
  cache_hit: boolean;
  output: DocumentResponse;
};

export type DocumentWebhookFailurePayload = {
  flow_type: "document";
  execution_id: string;
  status: "failed";
  cache_hit: false;
  error_message: string;
};

export type DocumentWebhookPayload = DocumentWebhookSuccessPayload | DocumentWebhookFailurePayload;

export interface DocumentWebhookNotifier {
  notify(payload: DocumentWebhookPayload): Promise<void>;
}

type FetchLike = typeof fetch;

export class HttpDocumentWebhookNotifier implements DocumentWebhookNotifier {
  constructor(
    private readonly url: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly retry = { attempts: 1, baseDelayMs: 0 },
  ) {}

  async notify(payload: DocumentWebhookPayload): Promise<void> {
    const response = await retryHttpOperation({
      operation: () => this.fetchFn(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      maxAttempts: this.retry.attempts,
      baseDelayMs: this.retry.baseDelayMs,
    });

    if (!response.ok) {
      throw new GenericError(`Webhook callback retornou HTTP ${response.status} ${response.statusText}.`);
    }
  }
}

export class NoopDocumentWebhookNotifier implements DocumentWebhookNotifier {
  async notify(_payload: DocumentWebhookPayload): Promise<void> {
    void _payload;
  }
}
