import type { FastifyInstance } from "fastify";
import { ReviewController } from "@/modules/review/controllers";
import { reviewRouteDocs } from "@/modules/review/docs";
import { DefaultReviewService, type ReviewService } from "@/modules/review/services";

export type ReviewRoutesDependencies = {
  reviewService?: ReviewService;
};

export class ReviewRoutes {
  private readonly controller: ReviewController;

  constructor(dependencies: ReviewRoutesDependencies = {}) {
    this.controller = new ReviewController(dependencies.reviewService ?? new DefaultReviewService());
  }

  register(app: FastifyInstance): void {
    app.post(
      "/api/v1/review",
      {
        attachValidation: true,
        schema: reviewRouteDocs,
      },
      this.controller.execute.bind(this.controller),
    );
  }
}
