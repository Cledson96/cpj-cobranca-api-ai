import { describe, expect, it, vi } from "vitest";
import { DefaultBatchService } from "@/modules/batch/services";
import type { BatchRequest } from "@shared";

const reviewOutput = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Simples."],
  summary: "ok",
};

const testsOutput = {
  framework: "vitest",
  test_file: [
    "import { expect, it } from 'vitest';",
    "import { sum } from './sum';",
    "",
    "it('soma dois numeros', () => {",
    "  expect(sum(1, 2)).toBe(3);",
    "});",
  ].join("\n"),
  test_cases: [],
  coverage_hints: [],
};

const batchInput: BatchRequest = {
  continue_on_error: true,
  notify: false,
  items: [
    {
      flow_type: "review",
      payload: {
        code: "function sum(a, b) { return a + b; }",
        language: "javascript",
      },
    },
    {
      flow_type: "tests",
      payload: {
        code: "export function sum(a: number, b: number) { return a + b; }",
        language: "typescript",
        test_framework: "vitest",
      },
    },
  ],
};

describe("DefaultBatchService", () => {
  it("executa fluxos sequencialmente e retorna success quando todos passam", async () => {
    const reviewService = { execute: vi.fn().mockResolvedValue(reviewOutput) };
    const testsService = { execute: vi.fn().mockResolvedValue(testsOutput) };
    const batchRepository = { createSummary: vi.fn().mockResolvedValue(undefined) };
    const service = new DefaultBatchService({
      reviewService,
      complianceService: { execute: vi.fn() },
      documentService: { execute: vi.fn() },
      testsService,
      batchRepository,
    });

    const output = await service.execute(batchInput);

    expect(output.status).toBe("success");
    expect(output.results).toMatchObject([
      { index: 0, flow_type: "review", status: "success", output: reviewOutput },
      { index: 1, flow_type: "tests", status: "success", output: testsOutput },
    ]);
    expect(reviewService.execute).toHaveBeenCalledWith(batchInput.items[0]?.payload);
    expect(testsService.execute).toHaveBeenCalledWith(batchInput.items[1]?.payload);
    expect(batchRepository.createSummary).toHaveBeenCalledWith({
      id: output.batch_id,
      status: "success",
      itemCount: 2,
      successCount: 2,
      failedCount: 0,
      durationMs: expect.any(Number),
    });
  });

  it("propaga execution_id e cache_hit reais quando o fluxo retorna metadados", async () => {
    const reviewService = {
      execute: vi.fn(),
      executeWithMetadata: vi.fn().mockResolvedValue({
        output: reviewOutput,
        execution_id: "execution-review-1",
        cache_hit: false,
      }),
    };
    const testsService = {
      execute: vi.fn(),
      executeWithMetadata: vi.fn().mockResolvedValue({
        output: testsOutput,
        execution_id: "execution-tests-1",
        cache_hit: true,
      }),
    };
    const service = new DefaultBatchService({
      reviewService,
      complianceService: { execute: vi.fn() },
      documentService: { execute: vi.fn() },
      testsService,
    });

    const output = await service.execute(batchInput);

    expect(output.results).toMatchObject([
      {
        index: 0,
        flow_type: "review",
        status: "success",
        execution_id: "execution-review-1",
        cache_hit: false,
        output: reviewOutput,
      },
      {
        index: 1,
        flow_type: "tests",
        status: "success",
        execution_id: "execution-tests-1",
        cache_hit: true,
        output: testsOutput,
      },
    ]);
    expect(reviewService.executeWithMetadata).toHaveBeenCalledWith(batchInput.items[0]?.payload);
    expect(testsService.executeWithMetadata).toHaveBeenCalledWith(batchInput.items[1]?.payload);
    expect(reviewService.execute).not.toHaveBeenCalled();
    expect(testsService.execute).not.toHaveBeenCalled();
  });

  it("continua apos erro quando continue_on_error e true e marca partial", async () => {
    const reviewService = { execute: vi.fn().mockRejectedValue(new Error("falha review")) };
    const testsService = { execute: vi.fn().mockResolvedValue(testsOutput) };
    const service = new DefaultBatchService({
      reviewService,
      complianceService: { execute: vi.fn() },
      documentService: { execute: vi.fn() },
      testsService,
    });

    const output = await service.execute(batchInput);

    expect(output.status).toBe("partial");
    expect(output.results).toMatchObject([
      { index: 0, flow_type: "review", status: "failed", error_message: "falha review" },
      { index: 1, flow_type: "tests", status: "success", output: testsOutput },
    ]);
    expect(testsService.execute).toHaveBeenCalledTimes(1);
  });

  it("para no primeiro erro quando continue_on_error e false", async () => {
    const reviewService = { execute: vi.fn().mockRejectedValue(new Error("falha review")) };
    const testsService = { execute: vi.fn().mockResolvedValue(testsOutput) };
    const service = new DefaultBatchService({
      reviewService,
      complianceService: { execute: vi.fn() },
      documentService: { execute: vi.fn() },
      testsService,
    });

    const output = await service.execute({
      ...batchInput,
      continue_on_error: false,
    });

    expect(output.status).toBe("failed");
    expect(output.results).toMatchObject([
      { index: 0, flow_type: "review", status: "failed", error_message: "falha review" },
    ]);
    expect(testsService.execute).not.toHaveBeenCalled();
  });
});
