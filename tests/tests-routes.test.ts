import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { TestsRequest, TestsResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const validPayload: TestsRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  test_framework: "vitest",
  prompt_version: 5,
};

const testsResponse: TestsResponse = {
  framework: "vitest",
  test_file: [
    "import { expect, it } from 'vitest';",
    "import { charge } from './charge';",
    "",
    "it('retorna true para valor positivo', () => {",
    "  expect(charge(100)).toBe(true);",
    "});",
  ].join("\n"),
  test_cases: [
    {
      name: "retorna true para valor positivo",
      type: "happy_path",
      description: "Valida regra principal.",
    },
  ],
  coverage_hints: ["Cobrir valores invalidos."],
};

function createApp() {
  const testsService = {
    execute: vi.fn().mockResolvedValue(testsResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { testsService },
    }),
    testsService,
  };
}

describe("POST /api/v1/tests", () => {
  it("gera testes com payload valido", async () => {
    const { app, testsService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(testsResponse);
    expect(testsService.execute).toHaveBeenCalledWith(validPayload);

    await app.close();
  });

  it("retorna 400 para payload invalido", async () => {
    const { app, testsService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests",
      payload: {
        code: "",
        language: "typescript",
        test_framework: "vitest",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "bad_request",
      message: "Payload invalido para geracao de testes.",
    });
    expect(testsService.execute).not.toHaveBeenCalled();

    await app.close();
  });

  it("retorna 500 controlado quando service falha", async () => {
    const testsService = {
      execute: vi.fn().mockRejectedValue(new Error("falha no provedor")),
    };
    const app = buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { testsService },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests",
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
