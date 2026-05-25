import { describe, expect, it, vi } from "vitest";
import { HttpReviewWebhookNotifier, NoopReviewWebhookNotifier } from "@/modules/review/engines";

describe("HttpReviewWebhookNotifier", () => {
  it("envia POST JSON para a URL configurada", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: "No Content" });
    const notifier = new HttpReviewWebhookNotifier("https://example.com/webhook", fetchFn);

    await notifier.notify({
      flow_type: "review",
      execution_id: "execution-1",
      status: "success",
      cache_hit: false,
      output: {
        overall_quality: "good",
        score: 9,
        issues: [],
        positives: ["Codigo legivel."],
        summary: "Sem problemas relevantes.",
      },
    });

    expect(fetchFn).toHaveBeenCalledWith("https://example.com/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: expect.stringContaining('"execution_id":"execution-1"'),
    });
  });

  it("falha com mensagem clara quando callback retorna erro HTTP", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });
    const notifier = new HttpReviewWebhookNotifier("https://example.com/webhook", fetchFn);

    await expect(notifier.notify({
      flow_type: "review",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).rejects.toThrow("Webhook callback retornou HTTP 503 Service Unavailable.");
  });
});

describe("NoopReviewWebhookNotifier", () => {
  it("ignora payload quando webhook nao esta configurado", async () => {
    const notifier = new NoopReviewWebhookNotifier();

    await expect(notifier.notify({
      flow_type: "review",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).resolves.toBeUndefined();
  });
});
