import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository, ReviewExecutionRepository } from "@/modules/executions";
import { DefaultModelsService, PrismaRegisteredModelRepository, type ModelRuntimeResolver } from "@/modules/models";
import { DefaultPromptsService, PrismaPromptVersionRepository, type PromptRuntimeResolver } from "@/modules/prompts";
import { ReviewController } from "@/modules/review/controllers";
import { pullRequestReviewRouteDocs, reviewRouteDocs, reviewStreamRouteDocs } from "@/modules/review/docs";
import { DefaultPullRequestReviewService, type PullRequestReviewService } from "@/modules/review/pull-request";
import { DefaultReviewService, type ReviewService } from "@/modules/review/services";
import type { PullRequestReviewRequest, PullRequestReviewResponse } from "@shared";

export type ReviewRoutesDependencies = {
  reviewService?: ReviewService;
  pullRequestReviewService?: PullRequestReviewService;
  promptResolver?: PromptRuntimeResolver;
  modelResolver?: ModelRuntimeResolver;
};

export class ReviewRoutes {
  private readonly dependencies: ReviewRoutesDependencies;

  constructor(dependencies: ReviewRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new ReviewController(
      this.createReviewService(app),
      this.createPullRequestReviewService(app),
    );

    app.post(
      "/api/v1/review",
      {
        attachValidation: true,
        schema: reviewRouteDocs,
      },
      controller.execute.bind(controller),
    );

    app.post(
      "/api/v1/review/stream",
      {
        attachValidation: true,
        schema: reviewStreamRouteDocs,
      },
      controller.executeStream.bind(controller),
    );

    app.post(
      "/api/v1/review/pull-request",
      {
        attachValidation: true,
        schema: pullRequestReviewRouteDocs,
      },
      controller.executePullRequest.bind(controller),
    );
  }

  private createReviewService(app: FastifyInstance): ReviewService {
    if (this.dependencies.reviewService) {
      return this.dependencies.reviewService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));
      const modelResolver = this.dependencies.modelResolver
        ?? new DefaultModelsService(new PrismaRegisteredModelRepository(app.prisma));

      return new DefaultReviewService({
        executionPersistence: new ReviewExecutionRepository(app.prisma),
        promptResolver,
        modelResolver,
      });
    }

    return new DefaultReviewService();
  }

  private createPullRequestReviewService(app: FastifyInstance): PullRequestReviewService {
    if (this.dependencies.pullRequestReviewService) {
      return this.dependencies.pullRequestReviewService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));
      const modelResolver = this.dependencies.modelResolver
        ?? new DefaultModelsService(new PrismaRegisteredModelRepository(app.prisma));

      return new DefaultPullRequestReviewService({
        persistence: new AgentExecutionRepository<PullRequestReviewRequest, PullRequestReviewResponse>(
          app.prisma,
          "pull_request_review",
        ),
        promptResolver,
        modelResolver,
      });
    }

    return new DefaultPullRequestReviewService();
  }
}
