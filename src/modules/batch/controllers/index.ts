import type { FastifyReply, FastifyRequest } from "fastify";
import { batchRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { BatchService } from "@/modules/batch/services";

export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = batchRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para batch.", parsed.error.flatten());
      }

      const output = await this.batchService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
