import type { FastifyReply, FastifyRequest } from "fastify";
import { reviewRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { ReviewService } from "@/modules/review/services";

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = reviewRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para code review.", parsed.error.flatten());
      }

      const output = await this.reviewService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
