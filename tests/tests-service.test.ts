import { describe, expect, it, vi } from "vitest";
import { DefaultTestsService } from "@/modules/tests/services";
import type { TestsRequest, TestsResponse } from "@shared";

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
});
