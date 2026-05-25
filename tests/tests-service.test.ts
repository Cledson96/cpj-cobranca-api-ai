import { describe, expect, it, vi } from "vitest";
import { DefaultTestsService } from "@/modules/tests/services";
import type { TestsRequest, TestsResponse } from "@shared";

const testsInput: TestsRequest = {
  code: "export function charge(amount: number) { return amount > 0; }",
  language: "typescript",
};

const testsOutput: TestsResponse = {
  framework: "vitest",
  strategy_summary: "Cobrir caminho feliz.",
  test_cases: [],
  test_code: "import { it } from 'vitest';",
  gaps: [],
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
