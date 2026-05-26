import { GenericError, NotFoundError } from "@/infrastructure/errors";
import type { ReviewExecution, ReviewExecutionListItem } from "@/modules/executions";
import type { HistoryDetail, HistoryListQuery, HistoryListResponse } from "@shared";

export type HistoryRepository = {
  listLatest(input?: number | HistoryListQuery): Promise<ReviewExecutionListItem[]>;
  findById(id: string): Promise<ReviewExecution | null>;
};

export interface HistoryService {
  listLatest(input?: HistoryListQuery): Promise<HistoryListResponse>;
  findById(id: string): Promise<HistoryDetail | null>;
}

export class DefaultHistoryService implements HistoryService {
  constructor(private readonly repository?: HistoryRepository) {}

  async listLatest(input: HistoryListQuery = { limit: 20 }): Promise<HistoryListResponse> {
    const repository = this.getRepository();
    const limit = input.limit ?? 20;
    const records = await repository.listLatest({
      ...input,
      limit: limit + 1,
    });
    const items = records.slice(0, limit);
    const nextItem = records.length > limit ? items.at(-1) : null;

    return {
      items,
      page: {
        limit,
        next_cursor: nextItem?.id ?? null,
      },
    };
  }

  async findById(id: string): Promise<HistoryDetail | null> {
    const repository = this.getRepository();
    const execution = await repository.findById(id);

    if (!execution) {
      throw new NotFoundError("Execucao nao encontrada.");
    }

    return execution;
  }

  private getRepository(): HistoryRepository {
    if (!this.repository) {
      throw new GenericError("Repositorio de historico nao configurado.");
    }

    return this.repository;
  }
}
