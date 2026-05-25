import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { DocumentRequest, DocumentResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: DocumentRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  title: "Servico de cobranca",
  audience: "developer",
  detail_level: "standard",
};

const documentResponse: DocumentResponse = {
  title: "Servico de cobranca",
  summary: "Documenta a regra principal de cobranca.",
  documentation: "## Servico de cobranca\n\nUse `charge` para validar cobrancas.",
  public_api: [
    {
      name: "charge",
      kind: "function",
      description: "Valida se uma cobranca tem valor positivo.",
    },
  ],
  examples: ["charge(100)"],
  gaps: [],
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
