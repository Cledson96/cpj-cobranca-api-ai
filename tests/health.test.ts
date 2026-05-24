import { describe, expect, it } from "vitest";
import { buildApp } from "@/app";
import { createTestEnv } from "./support/test-env";

describe("GET /health", () => {
  it("retorna status operacional da API", async () => {
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "cpj-cobranca-api-ai",
    });
    expect(response.json().timestamp).toMatch(/-03:00$/);

    await app.close();
  });
});
