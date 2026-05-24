import type { ReviewRequest, ReviewResponse } from "@shared";
import { ReviewEngine } from "../engines";

export interface ReviewService {
  execute(input: ReviewRequest): Promise<ReviewResponse>;
}

export class DefaultReviewService implements ReviewService {
  private reviewEngine?: ReviewEngine;

  async execute(input: ReviewRequest): Promise<ReviewResponse> {
    return this.getReviewEngine().execute(input);
  }

  private getReviewEngine(): ReviewEngine {
    if (!this.reviewEngine) {
      this.reviewEngine = ReviewEngine.createDefault();
    }

    return this.reviewEngine;
  }
}
