import type { FastifyInstance } from "fastify";
import { ModelsController } from "../controllers";
import {
  modelsCreateRouteDocs,
  modelsDefaultRouteDocs,
  modelsDeleteRouteDocs,
  modelsListRouteDocs,
  modelsUpdateRouteDocs,
} from "../docs";
import { PrismaRegisteredModelRepository } from "../repositories/registered-model.repository";
import { DefaultModelsService, type ModelsService } from "../services";

export type ModelsRoutesDependencies = {
  modelsService?: ModelsService;
};

export class ModelsRoutes {
  constructor(private readonly dependencies: ModelsRoutesDependencies = {}) {}

  register(app: FastifyInstance): void {
    const controller = new ModelsController(this.createModelsService(app));

    app.get("/api/v1/models", { attachValidation: true, schema: modelsListRouteDocs }, controller.list.bind(controller));
    app.get(
      "/api/v1/models/default",
      { attachValidation: true, schema: modelsDefaultRouteDocs },
      controller.findDefault.bind(controller),
    );
    app.post("/api/v1/models", { attachValidation: true, schema: modelsCreateRouteDocs }, controller.create.bind(controller));
    app.patch(
      "/api/v1/models/:id",
      { attachValidation: true, schema: modelsUpdateRouteDocs },
      controller.update.bind(controller),
    );
    app.delete(
      "/api/v1/models/:id",
      { attachValidation: true, schema: modelsDeleteRouteDocs },
      controller.delete.bind(controller),
    );
  }

  private createModelsService(app: FastifyInstance): ModelsService {
    if (this.dependencies.modelsService) {
      return this.dependencies.modelsService;
    }

    if ("prisma" in app) {
      return new DefaultModelsService(new PrismaRegisteredModelRepository(app.prisma));
    }

    return new DefaultModelsService();
  }
}
