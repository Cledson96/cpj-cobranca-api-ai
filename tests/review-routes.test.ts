import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { ReviewRequest, ReviewResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: ReviewRequest = {
  code: "export function soma(a: number, b: number) { return a + b; }",
  language: "typescript",
  context: "Modulo simples",
};

const reviewResponse: ReviewResponse = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Codigo simples e legivel."],
  summary: "Sem problemas relevantes.",
};

function createApp() {
  const reviewService = {
    execute: vi.fn().mockResolvedValue(reviewResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    }),
    reviewService,
  };
}

describe("POST /api/v1/review", () => {
  it("executa review com payload valido", async () => {
    const { app, reviewService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(reviewResponse);
    expect(reviewService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, reviewService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: {
        code: "",
        language: "typescript",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para code review.",
    });
    expect(reviewService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const reviewService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no provedor")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { reviewService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
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
