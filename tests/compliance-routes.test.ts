import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { ComplianceRequest, ComplianceResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: ComplianceRequest = {
  task_description: "Permitir renegociacao apenas para contratos ativos e registrar auditoria.",
  code: "if (contract.active) { renegotiate(contract); audit(contract.id); }",
  language: "typescript",
};

const complianceResponse: ComplianceResponse = {
  compliant: false,
  compliance_score: 70,
  covered_requirements: ["Valida contrato ativo antes da renegociacao."],
  missing_requirements: ["Nao garante auditoria para toda renegociacao."],
  partial_requirements: [],
  verdict: "Parcialmente aderente.",
};

function createApp() {
  const complianceService = {
    execute: vi.fn().mockResolvedValue(complianceResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { complianceService },
    }),
    complianceService,
  };
}

describe("POST /api/v1/compliance", () => {
  it("executa avaliacao de aderencia com payload valido", async () => {
    const { app, complianceService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/compliance",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(complianceResponse);
    expect(complianceService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, complianceService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/compliance",
      payload: {
        task_description: "",
        code: "renegotiate(contract);",
        language: "typescript",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para avaliacao de aderencia.",
    });
    expect(complianceService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const complianceService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no provedor")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { complianceService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/compliance",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "generic_error",
      message: "falha no provedor",
    });

    await app.close();
  });
});
