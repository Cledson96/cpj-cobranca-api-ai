import { describe, expect, it, vi } from "vitest";
import { DefaultTestsService } from "@/modules/tests/services";
import type { TestsExecutionPersistence } from "@/modules/tests/engines";
import type { ReviewExecutionRecord } from "@/modules/executions";
import { createPayloadHash, type TestsRequest, type TestsResponse } from "@shared";

const testsInput: TestsRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
  test_framework: "vitest",
};

const testsOutput: TestsResponse = {
  framework: "vitest",
  test_file: [
    "import { expect, it } from 'vitest';",
    "import { charge } from './charge';",
    "",
    "it('retorna true para valor positivo', () => {",
    "  expect(charge(100)).toBe(true);",
    "});",
  ].join("\n"),
  test_cases: [],
  coverage_hints: [],
};

describe("DefaultTestsService", () => {
  it("delega execucao para o TestsEngine configurado", async () => {
    const testsEngine = {
      execute: vi.fn().mockResolvedValue(testsOutput),
    };
    const service = new DefaultTestsService({ testsEngine });

    const output = await service.execute(testsInput);

    expect(output).toEqual(testsOutput);
    expect(testsEngine.execute).toHaveBeenCalledWith(testsInput);
  });

  it("retorna metadados da execucao persistida", async () => {
    const testsEngine = {
      execute: vi.fn().mockResolvedValue(testsOutput),
    };
    const executionRecord: ReviewExecutionRecord = {
      id: "execution-tests-1",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      flowType: "tests",
      status: "success",
      inputPayload: testsInput,
      outputPayload: testsOutput,
      durationMs: 12,
      requestHash: createPayloadHash(testsInput),
      cacheHit: true,
      sourceExecutionId: "execution-tests-source",
      errorMessage: null,
    };
    const findSuccessByHash = vi.fn().mockResolvedValue(executionRecord);
    const executionPersistence = {
      findSuccessByHash,
    } as unknown as TestsExecutionPersistence;
    const service = new DefaultTestsService({ testsEngine, executionPersistence });

    const output = await service.executeWithMetadata(testsInput);

    expect(output).toEqual({
      output: testsOutput,
      execution_id: "execution-tests-1",
      cache_hit: true,
    });
    expect(testsEngine.execute).toHaveBeenCalledWith(testsInput);
    expect(findSuccessByHash).toHaveBeenCalledWith(createPayloadHash(testsInput));
  });
});
