import { retryHttpOperation, type TestsResponse } from "@shared";
import { GenericError } from "@/infrastructure/errors";

export type TestsWebhookSuccessPayload = {
  flow_type: "tests";
  execution_id: string;
  status: "success";
  cache_hit: boolean;
  output: TestsResponse;
};

export type TestsWebhookFailurePayload = {
  flow_type: "tests";
  execution_id: string;
  status: "failed";
  cache_hit: false;
  error_message: string;
};

export type TestsWebhookPayload = TestsWebhookSuccessPayload | TestsWebhookFailurePayload;

export interface TestsWebhookNotifier {
  notify(payload: TestsWebhookPayload): Promise<void>;
}

type FetchLike = typeof fetch;

export class HttpTestsWebhookNotifier implements TestsWebhookNotifier {
  constructor(
    private readonly url: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly retry = { attempts: 1, baseDelayMs: 0 },
  ) {}

  async notify(payload: TestsWebhookPayload): Promise<void> {
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

export class NoopTestsWebhookNotifier implements TestsWebhookNotifier {
  async notify(_payload: TestsWebhookPayload): Promise<void> {
    void _payload;
  }
}
