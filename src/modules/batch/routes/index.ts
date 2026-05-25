import type { FastifyInstance } from "fastify";
import { BatchController } from "@/modules/batch/controllers";
import { batchRouteDocs } from "@/modules/batch/docs";
import { DefaultBatchService, type BatchService } from "@/modules/batch/services";

export type BatchRoutesDependencies = {
  batchService?: BatchService;
};

export class BatchRoutes {
  private readonly dependencies: BatchRoutesDependencies;

  constructor(dependencies: BatchRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new BatchController(this.createBatchService());

    app.post(
      "/api/v1/batch",
      {
        attachValidation: true,
        schema: batchRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createBatchService(): BatchService {
    return this.dependencies.batchService ?? new DefaultBatchService();
  }
}
