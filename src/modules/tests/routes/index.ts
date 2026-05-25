import type { FastifyInstance } from "fastify";
import { TestsController } from "@/modules/tests/controllers";
import { testsRouteDocs } from "@/modules/tests/docs";
import { DefaultTestsService, type TestsService } from "@/modules/tests/services";

export type TestsRoutesDependencies = {
  testsService?: TestsService;
};

export class TestsRoutes {
  private readonly dependencies: TestsRoutesDependencies;

  constructor(dependencies: TestsRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new TestsController(this.createTestsService());

    app.post(
      "/api/v1/tests",
      {
        attachValidation: true,
        schema: testsRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createTestsService(): TestsService {
    return this.dependencies.testsService ?? new DefaultTestsService();
  }
}
