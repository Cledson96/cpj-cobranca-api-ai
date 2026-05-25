import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import type { TestsResponse } from "@shared";
import { createTestEnv } from "./support/test-env";

const testsResponse: TestsResponse = {
  framework: "vitest",
  test_file: [
    "import { describe, expect, it } from 'vitest';",
    "import { charge } from './charge';",
    "",
    "describe('charge', () => {",
    "  it('covers critical changed behavior', () => {",
    "    expect(charge(100)).toBe(true);",
    "  });",
    "});",
  ].join("\n"),
  test_cases: [
    {
      name: "covers critical changed behavior",
      type: "happy_path",
      description: "Cobre funcao critica alterada no PR.",
    },
  ],
  coverage_hints: ["Adicionar caso de erro para valores invalidos."],
};

function createApp() {
  const testsService = {
    execute: vi.fn(),
  };
  const pullRequestTestsService = {
    execute: vi.fn().mockResolvedValue(testsResponse),
  };

  return {
    app: buildApp({
      env: createTestEnv(),
      registerDatabase: false,
      serverOptions: { logger: false },
      dependencies: { testsService, pullRequestTestsService },
    }),
    pullRequestTestsService,
  };
}

describe("POST /api/v1/tests/pull-request", () => {
  it("gera testes unitarios baseados em um pull request", async () => {
    const { app, pullRequestTestsService } = createApp();
    const payload = {
      github_pull_request_url: "https://github.com/acme/app/pull/42",
      test_framework: "vitest",
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests/pull-request",
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(testsResponse);
    expect(pullRequestTestsService.execute).toHaveBeenCalledWith({
      ...payload,
      base_branch: "main",
    });

    await app.close();
  });

  it("retorna 400 para URL invalida", async () => {
    const { app, pullRequestTestsService } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests/pull-request",
      payload: {
        github_pull_request_url: "https://github.com/acme/app/issues/42",
        test_framework: "vitest",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(pullRequestTestsService.execute).not.toHaveBeenCalled();

    await app.close();
  });
});
