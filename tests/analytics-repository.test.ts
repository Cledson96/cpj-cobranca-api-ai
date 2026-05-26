import { describe, expect, it, vi } from "vitest";
import { PrismaAnalyticsRepository } from "@/modules/analytics";

function createRepository() {
  const prisma = {
    execution: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  return {
    prisma,
    repository: new PrismaAnalyticsRepository(prisma),
  };
}

describe("PrismaAnalyticsRepository", () => {
  it("busca registros de uso com filtros de periodo, fluxo e modelo", async () => {
    const { prisma, repository } = createRepository();

    await repository.listUsageRecords({
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
      flow_type: "review",
      model: "openai/gpt-4o-mini",
    });

    expect(prisma.execution.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" },
      where: {
        flowType: "review",
        createdAt: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lte: new Date("2026-05-31T23:59:59.000Z"),
        },
        telemetry: {
          is: {
            modelRequested: "openai/gpt-4o-mini",
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        flowType: true,
        status: true,
        durationMs: true,
        cacheHit: true,
        telemetry: true,
      },
    });
  });
});
