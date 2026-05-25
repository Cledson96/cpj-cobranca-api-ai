import { describe, expect, it, vi } from "vitest";
import { HttpComplianceWebhookNotifier, NoopComplianceWebhookNotifier } from "@/modules/compliance/engines";

describe("HttpComplianceWebhookNotifier", () => {
  it("envia POST JSON para a URL configurada", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: "No Content" });
    const notifier = new HttpComplianceWebhookNotifier("https://example.com/webhook", fetchFn);

    await notifier.notify({
      flow_type: "compliance",
      execution_id: "execution-1",
      status: "success",
      cache_hit: false,
      output: {
        compliant: true,
        compliance_score: 95,
        covered_requirements: ["Auditoria registrada."],
        missing_requirements: [],
        partial_requirements: [],
        verdict: "Aderente.",
      },
    });

    expect(fetchFn).toHaveBeenCalledWith("https://example.com/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: expect.stringContaining('"flow_type":"compliance"'),
    });
  });

  it("falha com mensagem clara quando callback retorna erro HTTP", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" });
    const notifier = new HttpComplianceWebhookNotifier("https://example.com/webhook", fetchFn);

    await expect(notifier.notify({
      flow_type: "compliance",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).rejects.toThrow("Webhook callback retornou HTTP 503 Service Unavailable.");
  });
});

describe("NoopComplianceWebhookNotifier", () => {
  it("ignora payload quando webhook nao esta configurado", async () => {
    const notifier = new NoopComplianceWebhookNotifier();

    await expect(notifier.notify({
      flow_type: "compliance",
      execution_id: "execution-1",
      status: "failed",
      cache_hit: false,
      error_message: "falha no llm",
    })).resolves.toBeUndefined();
  });
});
