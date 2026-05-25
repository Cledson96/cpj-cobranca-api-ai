import { describe, expect, it, vi } from "vitest";
import { BatchExecutionRepository } from "@/modules/batch/repositories";

function createRepository() {
  const prisma = {
    batchExecution: {
      create: vi.fn(),
    },
  };

  return {
    prisma,
    repository: new BatchExecutionRepository(prisma),
  };
}

describe("BatchExecutionRepository", () => {
  it("cria resumo de execucao de batch", async () => {
    const { prisma, repository } = createRepository();
    prisma.batchExecution.create.mockResolvedValue({
      id: "batch-1",
      status: "partial",
      itemCount: 2,
      successCount: 1,
      failedCount: 1,
      durationMs: 123,
    });

    await repository.createSummary({
      id: "batch-1",
      status: "partial",
      itemCount: 2,
      successCount: 1,
      failedCount: 1,
      durationMs: 123,
    });

    expect(prisma.batchExecution.create).toHaveBeenCalledWith({
      data: {
        id: "batch-1",
        status: "partial",
        itemCount: 2,
        successCount: 1,
        failedCount: 1,
        durationMs: 123,
      },
    });
  });
});
