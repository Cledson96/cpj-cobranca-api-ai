import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { DocumentRequest, DocumentResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: DocumentRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  doc_type: "technical",
  prompt_version: 2,
};

const documentResponse: DocumentResponse = {
  doc_type: "technical",
  title: "Servico de cobranca",
  description: "Valida se uma cobranca tem valor positivo.",
  inputs: [
    {
      name: "amount",
      type: "number",
      description: "Valor da cobranca.",
    },
  ],
  outputs: [
    {
      name: "return",
      type: "boolean",
      description: "Resultado da validacao.",
    },
  ],
  side_effects: [],
  usage_example: "charge(100)",
  notes: null,
};

function createApp() {
  const documentService = {
    execute: vi.fn().mockResolvedValue(documentResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { documentService },
    }),
    documentService,
  };
}

describe("POST /api/v1/document", () => {
  it("gera documentacao com payload valido", async () => {
    const { app, documentService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/document",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(documentResponse);
    expect(documentService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, documentService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/document",
      payload: {
        code: "",
        language: "typescript",
        doc_type: "technical",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para documentacao.",
    });
    expect(documentService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const documentService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no provedor")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { documentService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/document",
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
