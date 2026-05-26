import type { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import { analyticsUsageQuerySchema } from "@shared";
import type { AnalyticsService } from "../services";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getUsage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = analyticsUsageQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new BadRequestError("Query invalida para analytics.", parsed.error.flatten());
      }

      const output = await this.analyticsService.getUsage(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
