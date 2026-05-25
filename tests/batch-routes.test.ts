import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { BatchRequest, BatchResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: BatchRequest = {
  items: [
    {
      flow_type: "review",
      payload: {
        code: "function sum(a, b) { return a + b; }",
        language: "javascript",
      },
    },
  ],
  continue_on_error: true,
  notify: false,
};

const batchResponse: BatchResponse = {
  batch_id: "batch-1",
  status: "success",
  results: [
    {
      index: 0,
      flow_type: "review",
      execution_id: null,
      status: "success",
      cache_hit: null,
      output: { summary: "ok" },
      error_message: null,
    },
  ],
};

function createApp() {
  const batchService = {
    execute: vi.fn().mockResolvedValue(batchResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { batchService },
    }),
    batchService,
  };
}

describe("POST /api/v1/batch", () => {
  it("executa batch com payload valido", async () => {
    const { app, batchService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/batch",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(batchResponse);
    expect(batchService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, batchService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/batch",
      payload: {
        items: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para batch.",
    });
    expect(batchService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const batchService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no batch")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { batchService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/batch",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "generic_error",
      message: "falha no batch",
    });

    await app.close();
  });
});
