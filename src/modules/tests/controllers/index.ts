import type { FastifyReply, FastifyRequest } from "fastify";
import { testsRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { TestsService } from "@/modules/tests/services";

export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = testsRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para geracao de testes.", parsed.error.flatten());
      }

      const output = await this.testsService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
