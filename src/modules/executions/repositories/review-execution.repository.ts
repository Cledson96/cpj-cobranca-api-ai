import type { ReviewRequest, ReviewResponse } from "@shared";
import type { ReviewExecutionRepositoryPrisma } from "@/modules/executions/models";
import { AgentExecutionRepository } from "./agent-execution.repository";

export class ReviewExecutionRepository extends AgentExecutionRepository<ReviewRequest, ReviewResponse> {
  constructor(prisma: ReviewExecutionRepositoryPrisma) {
    super(prisma, "review");
  }
}
