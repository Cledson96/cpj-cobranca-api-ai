import type { CreateBatchSummaryInput, BatchSummaryRepository } from "@/modules/batch/services";

export type BatchExecutionRepositoryPrisma = {
  batchExecution: {
    create(input: {
      data: {
        id: string;
        status: CreateBatchSummaryInput["status"];
        itemCount: number;
        successCount: number;
        failedCount: number;
        durationMs: number;
      };
    }): Promise<unknown>;
  };
};

export class BatchExecutionRepository implements BatchSummaryRepository {
  constructor(private readonly prisma: BatchExecutionRepositoryPrisma) {}

  async createSummary(input: CreateBatchSummaryInput): Promise<void> {
    await this.prisma.batchExecution.create({
      data: {
        id: input.id,
        status: input.status,
        itemCount: input.itemCount,
        successCount: input.successCount,
        failedCount: input.failedCount,
        durationMs: input.durationMs,
      },
    });
  }
}
