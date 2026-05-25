import { describe, expect, it } from "vitest";
import { buildApp } from "@/app";
import { createTestEnv } from "./support/test-env";

describe("OpenAPI", () => {
  it("documenta as rotas publicas no Swagger", async () => {
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
    });

    const response = await app.inject({
      method: "GET",
      url: "/docs/json",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: expect.any(String),
      paths: {
        "/api/v1/review": {
          post: {
            tags: ["Review"],
            summary: expect.any(String),
          },
        },
        "/api/v1/compliance": {
          post: {
            tags: ["Compliance"],
            summary: expect.any(String),
          },
        },
        "/api/v1/history": {
          get: {
            tags: ["History"],
            summary: expect.any(String),
          },
        },
        "/api/v1/history/{id}": {
          get: {
            tags: ["History"],
            summary: expect.any(String),
          },
        },
      },
    });

    await app.close();
  });
});
