import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository } from "@/modules/executions";
import { DefaultModelsService, PrismaRegisteredModelRepository, type ModelRuntimeResolver } from "@/modules/models";
import { DefaultPromptsService, PrismaPromptVersionRepository, type PromptRuntimeResolver } from "@/modules/prompts";
import { TestsController } from "@/modules/tests/controllers";
import { pullRequestTestsRouteDocs, testsRouteDocs } from "@/modules/tests/docs";
import { DefaultPullRequestTestsService, type PullRequestTestsService } from "@/modules/tests/pull-request";
import { DefaultTestsService, type TestsService } from "@/modules/tests/services";
import type { PullRequestTestsRequest, TestsRequest, TestsResponse } from "@shared";

export type TestsRoutesDependencies = {
  testsService?: TestsService;
  pullRequestTestsService?: PullRequestTestsService;
  promptResolver?: PromptRuntimeResolver;
  modelResolver?: ModelRuntimeResolver;
};

export class TestsRoutes {
  private readonly dependencies: TestsRoutesDependencies;

  constructor(dependencies: TestsRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new TestsController(
      this.createTestsService(app),
      this.createPullRequestTestsService(app),
    );

    app.post(
      "/api/v1/tests",
      {
        attachValidation: true,
        schema: testsRouteDocs,
      },
      controller.execute.bind(controller),
    );

    app.post(
      "/api/v1/tests/pull-request",
      {
        attachValidation: true,
        schema: pullRequestTestsRouteDocs,
      },
      controller.executePullRequest.bind(controller),
    );
  }

  private createTestsService(app: FastifyInstance): TestsService {
    if (this.dependencies.testsService) {
      return this.dependencies.testsService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));
      const modelResolver = this.dependencies.modelResolver
        ?? new DefaultModelsService(new PrismaRegisteredModelRepository(app.prisma));

      return new DefaultTestsService({
        executionPersistence: new AgentExecutionRepository<TestsRequest, TestsResponse>(
          app.prisma,
          "tests",
        ),
        promptResolver,
        modelResolver,
      });
    }

    return new DefaultTestsService();
  }

  private createPullRequestTestsService(app: FastifyInstance): PullRequestTestsService {
    if (this.dependencies.pullRequestTestsService) {
      return this.dependencies.pullRequestTestsService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));
      const modelResolver = this.dependencies.modelResolver
        ?? new DefaultModelsService(new PrismaRegisteredModelRepository(app.prisma));

      return new DefaultPullRequestTestsService({
        persistence: new AgentExecutionRepository<PullRequestTestsRequest, TestsResponse>(
          app.prisma,
          "tests",
        ),
        promptResolver,
        modelResolver,
      });
    }

    return new DefaultPullRequestTestsService();
  }
}
