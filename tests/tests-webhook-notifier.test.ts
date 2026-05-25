import { describe, expect, it, vi } from "vitest";
import { HttpTestsWebhookNotifier, NoopTestsWebhookNotifier } from "@/modules/tests/engines";

describe("HttpTestsWebhookNotifier", () => {
  it("envia POST JSON para a URL configurada", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: "No Content" });
    const notifier = new HttpTestsWebhookNotifier("https://example.com/webhook", fetchFn);

    await notifier.notify({
      flow_type: "tests",
      execution_id: "execution-1",
      status: "success",
      cache_hit: false,
      output: {
        framework: "vitest",
        strategy_summary: "Cobrir caminho feliz.",
        test_cases: [],
        test_code: "import { it } from 'vitest';",
        gaps: [],
      },
    });

    expect(fetchFn).toHaveBeenCalledWith("https://example.com/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: expect.stringContaining('"flow_type":"tests"'),
    });
  });

  it("falha com mensagem clara quando callback retorna erro HTTP", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });
    const notifier = new HttpTestsWebhookNotifier("https://example.com/webhook", fetchFn);

    await expect(notifier.notify({
      flow_type: "tests",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).rejects.toThrow("Webhook callback retornou HTTP 503 Service Unavailable.");
  });
});

describe("NoopTestsWebhookNotifier", () => {
  it("ignora payload quando webhook nao esta configurado", async () => {
    const notifier = new NoopTestsWebhookNotifier();

    await expect(notifier.notify({
      flow_type: "tests",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).resolves.toBeUndefined();
  });
});
