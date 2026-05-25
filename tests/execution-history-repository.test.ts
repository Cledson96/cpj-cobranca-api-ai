import { describe, expect, it, vi } from "vitest";
import { ExecutionHistoryRepository } from "@/modules/executions";

const createdAt = new Date("2026-05-24T15:30:45.000Z");

function createRepository() {
  const prisma = {
    execution: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    prisma,
    repository: new ExecutionHistoryRepository(prisma),
  };
}

describe("ExecutionHistoryRepository", () => {
  it("lista execucoes de multiplos fluxos", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.findMany.mockResolvedValue([
      {
        id: "execution-compliance-1",
        createdAt,
        flowType: "compliance",
        status: "success",
        durationMs: 900,
        cacheHit: false,
        sourceExecutionId: null,
        telemetry: null,
        steps: [],
      },
      {
        id: "execution-review-1",
        createdAt,
        flowType: "review",
        status: "success",
        durationMs: 1200,
        cacheHit: false,
        sourceExecutionId: null,
        telemetry: null,
        steps: [],
      },
    ]);

    const items = await repository.listLatest(20);

    expect(items.map((item) => item.type)).toEqual(["compliance", "review"]);
    expect(prisma.execution.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: expect.any(Object),
    });
  });

  it("busca detalhe por id sem restringir flowType", async () => {
    const { prisma, repository } = createRepository();
    prisma.execution.findUnique.mockResolvedValue({
      id: "execution-compliance-1",
      createdAt,
      flowType: "compliance",
      status: "success",
      inputPayload: {
        task_description: "Registrar auditoria.",
        code: "audit(contract.id);",
        language: "typescript",
      },
      outputPayload: {
        compliant: true,
        compliance_score: 100,
        covered_requirements: ["Auditoria registrada."],
        missing_requirements: [],
        partial_requirements: [],
        verdict: "Aderente.",
      },
      durationMs: 900,
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
      telemetry: null,
      steps: [],
    });

    const detail = await repository.findById("execution-compliance-1");

    expect(detail?.type).toBe("compliance");
    expect(prisma.execution.findUnique).toHaveBeenCalledWith({
      where: { id: "execution-compliance-1" },
      include: {
        telemetry: true,
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });
});
