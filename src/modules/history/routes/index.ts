import type { FastifyInstance } from "fastify";
import { ExecutionHistoryRepository } from "@/modules/executions";
import { HistoryController } from "../controllers";
import { historyDetailRouteDocs, historyListRouteDocs } from "../docs";
import { DefaultHistoryService, type HistoryService } from "../services";

export type HistoryRoutesDependencies = {
  historyService?: HistoryService;
};

export class HistoryRoutes {
  constructor(private readonly dependencies: HistoryRoutesDependencies = {}) {}

  register(app: FastifyInstance): void {
    const controller = new HistoryController(this.createHistoryService(app));

    app.get(
      "/api/v1/history",
      {
        attachValidation: true,
        schema: historyListRouteDocs,
      },
      controller.listLatest.bind(controller),
    );

    app.get(
      "/api/v1/history/:id",
      {
        schema: historyDetailRouteDocs,
      },
      controller.findById.bind(controller),
    );
  }

  private createHistoryService(app: FastifyInstance): HistoryService {
    if (this.dependencies.historyService) {
      return this.dependencies.historyService;
    }

    if ("prisma" in app) {
      return new DefaultHistoryService(new ExecutionHistoryRepository(app.prisma));
    }

    return new DefaultHistoryService();
  }
}
