import type { FastifyReply, FastifyRequest } from "fastify";
import { documentRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { DocumentService } from "@/modules/document/services";

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = documentRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para documentacao.", parsed.error.flatten());
      }

      const output = await this.documentService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
