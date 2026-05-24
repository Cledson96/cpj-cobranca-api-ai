import { GenericError, NotFoundError } from "@/infrastructure/errors";
import type { ReviewExecution, ReviewExecutionListItem } from "@/modules/executions";
import type { HistoryDetail, HistoryListResponse } from "@shared";

export type HistoryRepository = {
  listLatest(take?: number): Promise<ReviewExecutionListItem[]>;
  findById(id: string): Promise<ReviewExecution | null>;
};

export interface HistoryService {
  listLatest(): Promise<HistoryListResponse>;
  findById(id: string): Promise<HistoryDetail | null>;
}

export class DefaultHistoryService implements HistoryService {
  constructor(private readonly repository?: HistoryRepository) {}

  async listLatest(): Promise<HistoryListResponse> {
    const repository = this.getRepository();
    const items = await repository.listLatest();

    return { items };
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
