import { describe, expect, it } from "vitest";
import { buildApp } from "@/app.js";

describe("GET /health", () => {
  it("retorna status operacional da API", async () => {
    const app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "cpj-cobranca-api-ai",
    });
    expect(response.json().timestamp).toEqual(expect.any(String));

    await app.close();
  });
});
