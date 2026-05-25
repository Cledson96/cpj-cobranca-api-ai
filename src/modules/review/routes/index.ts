import type { FastifyInstance } from "fastify";
import { ReviewExecutionRepository } from "@/modules/executions";
import { ReviewController } from "@/modules/review/controllers";
import { reviewRouteDocs, reviewStreamRouteDocs } from "@/modules/review/docs";
import { DefaultReviewService, type ReviewService } from "@/modules/review/services";

export type ReviewRoutesDependencies = {
  reviewService?: ReviewService;
};

export class ReviewRoutes {
  private readonly dependencies: ReviewRoutesDependencies;

  constructor(dependencies: ReviewRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new ReviewController(this.createReviewService(app));

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
  }

  private createReviewService(app: FastifyInstance): ReviewService {
    if (this.dependencies.reviewService) {
      return this.dependencies.reviewService;
    }

    if ("prisma" in app) {
      return new DefaultReviewService({
        executionPersistence: new ReviewExecutionRepository(app.prisma),
      });
    }

    return new DefaultReviewService();
  }
}
