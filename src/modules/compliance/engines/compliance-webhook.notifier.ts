import type { ComplianceResponse } from "@shared";

export type ComplianceWebhookSuccessPayload = {
  flow_type: "compliance";
  execution_id: string;
  status: "success";
  cache_hit: boolean;
  output: ComplianceResponse;
};

export type ComplianceWebhookFailedPayload = {
  flow_type: "compliance";
  execution_id: string;
  status: "failed";
  cache_hit: false;
  error_message: string;
};

export type ComplianceWebhookPayload = ComplianceWebhookSuccessPayload | ComplianceWebhookFailedPayload;

export interface ComplianceWebhookNotifier {
  notify(payload: ComplianceWebhookPayload): Promise<void>;
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

export class HttpComplianceWebhookNotifier implements ComplianceWebhookNotifier {
  constructor(
    private readonly callbackUrl: string,
    private readonly fetchFn: WebhookFetch = fetch,
  ) {}

  async notify(payload: ComplianceWebhookPayload): Promise<void> {
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

export class NoopComplianceWebhookNotifier implements ComplianceWebhookNotifier {
  async notify(_payload: ComplianceWebhookPayload): Promise<void> {
    void _payload;
  }
}
