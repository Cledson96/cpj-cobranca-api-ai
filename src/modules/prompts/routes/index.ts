import type { FastifyInstance } from "fastify";
import { PromptsController } from "../controllers";
import {
  promptsActiveRouteDocs,
  promptsActivateRouteDocs,
  promptsCreateRouteDocs,
  promptsDetailRouteDocs,
  promptsListRouteDocs,
} from "../docs";
import { PrismaPromptVersionRepository } from "../repositories/prompt-version.repository";
import { DefaultPromptsService, type PromptsService } from "../services";

export type PromptsRoutesDependencies = {
  promptsService?: PromptsService;
};

export class PromptsRoutes {
  constructor(private readonly dependencies: PromptsRoutesDependencies = {}) {}

  register(app: FastifyInstance): void {
    const controller = new PromptsController(this.createPromptsService(app));

    app.get("/api/v1/prompts", { attachValidation: true, schema: promptsListRouteDocs }, controller.list.bind(controller));
    app.get(
      "/api/v1/prompts/:flowType/active",
      { attachValidation: true, schema: promptsActiveRouteDocs },
      controller.findActive.bind(controller),
    );
    app.get(
      "/api/v1/prompts/:flowType/:version",
      { attachValidation: true, schema: promptsDetailRouteDocs },
      controller.findVersion.bind(controller),
    );
    app.post(
      "/api/v1/prompts",
      { attachValidation: true, schema: promptsCreateRouteDocs },
      controller.create.bind(controller),
    );
    app.post(
      "/api/v1/prompts/:flowType/:version/activate",
      { attachValidation: true, schema: promptsActivateRouteDocs },
      controller.activate.bind(controller),
    );
  }

  private createPromptsService(app: FastifyInstance): PromptsService {
    if (this.dependencies.promptsService) {
      return this.dependencies.promptsService;
    }

    if ("prisma" in app) {
      return new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));
    }

    return new DefaultPromptsService();
  }
}
