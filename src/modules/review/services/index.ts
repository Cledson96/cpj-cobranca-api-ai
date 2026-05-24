import type { ReviewRequest, ReviewResponse } from "@shared";
import { ReviewEngine, type ReviewExecutionPersistence } from "../engines";

export interface ReviewService {
  execute(input: ReviewRequest): Promise<ReviewResponse>;
}

export type DefaultReviewServiceDependencies = {
  reviewEngine?: ReviewEngine;
  executionPersistence?: ReviewExecutionPersistence;
};

export class DefaultReviewService implements ReviewService {
  private reviewEngine?: ReviewEngine;
  private readonly executionPersistence?: ReviewExecutionPersistence;

  constructor(dependencies: DefaultReviewServiceDependencies = {}) {
    this.reviewEngine = dependencies.reviewEngine;
    this.executionPersistence = dependencies.executionPersistence;
  }

  async execute(input: ReviewRequest): Promise<ReviewResponse> {
    return this.getReviewEngine().execute(input);
  }

  private getReviewEngine(): ReviewEngine {
    if (!this.reviewEngine) {
      this.reviewEngine = ReviewEngine.createDefault({
        persistence: this.executionPersistence,
      });
    }

    return this.reviewEngine;
  }
}
