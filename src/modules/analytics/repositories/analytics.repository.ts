import type { AnalyticsUsageQuery } from "@shared";
import type { PrismaExecutionDelegate } from "@/modules/executions";
import type { AnalyticsUsageRecord } from "../services";

export type PrismaAnalyticsRepositoryClient = {
  execution: Pick<PrismaExecutionDelegate, "findMany">;
};

export class PrismaAnalyticsRepository {
  constructor(private readonly prisma: PrismaAnalyticsRepositoryClient) {}

  async listUsageRecords(input: AnalyticsUsageQuery): Promise<AnalyticsUsageRecord[]> {
    return this.prisma.execution.findMany({
      orderBy: { createdAt: "asc" },
      where: createWhere(input),
      select: {
        id: true,
        createdAt: true,
        flowType: true,
        status: true,
        durationMs: true,
        cacheHit: true,
        telemetry: true,
      },
    }) as Promise<AnalyticsUsageRecord[]>;
  }
}

function createWhere(input: AnalyticsUsageQuery) {
  const where: Record<string, unknown> = {};

  if (input.flow_type) {
    where.flowType = input.flow_type;
  }

  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: new Date(input.from) } : {}),
      ...(input.to ? { lte: new Date(input.to) } : {}),
    };
  }

  if (input.model) {
    where.telemetry = {
      is: {
        modelRequested: input.model,
      },
    };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}
