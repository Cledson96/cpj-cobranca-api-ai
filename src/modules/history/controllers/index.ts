import type { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestError, NotFoundError, handleUnknownError } from "@/infrastructure/errors";
import { historyDetailParamsSchema } from "@shared";
import type { HistoryService } from "../services";

export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  async listLatest(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const output = await this.historyService.listLatest();
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async findById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = historyDetailParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new BadRequestError("Parametro de historico invalido.", parsed.error.flatten());
      }

      const output = await this.historyService.findById(parsed.data.id);
      if (!output) {
        throw new NotFoundError("Execucao nao encontrada.");
      }
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
