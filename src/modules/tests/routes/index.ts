import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository } from "@/modules/executions";
import { DefaultPromptsService, PrismaPromptVersionRepository, type PromptRuntimeResolver } from "@/modules/prompts";
import { TestsController } from "@/modules/tests/controllers";
import { testsRouteDocs } from "@/modules/tests/docs";
import { DefaultTestsService, type TestsService } from "@/modules/tests/services";
import type { TestsRequest, TestsResponse } from "@shared";

export type TestsRoutesDependencies = {
  testsService?: TestsService;
  promptResolver?: PromptRuntimeResolver;
};

export class TestsRoutes {
  private readonly dependencies: TestsRoutesDependencies;

  constructor(dependencies: TestsRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new TestsController(this.createTestsService(app));

    app.post(
      "/api/v1/tests",
      {
        attachValidation: true,
        schema: testsRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createTestsService(app: FastifyInstance): TestsService {
    if (this.dependencies.testsService) {
      return this.dependencies.testsService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));

      return new DefaultTestsService({
        executionPersistence: new AgentExecutionRepository<TestsRequest, TestsResponse>(
          app.prisma,
          "tests",
        ),
        promptResolver,
      });
    }

    return new DefaultTestsService();
  }
}
