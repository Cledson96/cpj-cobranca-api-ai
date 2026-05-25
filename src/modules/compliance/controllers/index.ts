import type { FastifyReply, FastifyRequest } from "fastify";
import { complianceRequestSchema } from "@shared";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import type { ComplianceService } from "@/modules/compliance/services";

export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  async execute(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = complianceRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para avaliacao de aderencia.", parsed.error.flatten());
      }

      const output = await this.complianceService.execute(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
