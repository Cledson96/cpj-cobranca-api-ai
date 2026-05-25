import type { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import {
  modelCreateRequestSchema,
  modelIdParamsSchema,
  modelUpdateRequestSchema,
} from "@shared";
import type { ModelsService } from "../services";

export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const output = await this.modelsService.list();
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async findDefault(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const output = await this.modelsService.findDefault();
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = modelCreateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para cadastro de modelo.", parsed.error.flatten());
      }

      const output = await this.modelsService.create(parsed.data);
      reply.status(201).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const params = modelIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        throw new BadRequestError("Parametros invalidos para edicao de modelo.", params.error.flatten());
      }

      const body = modelUpdateRequestSchema.safeParse(request.body);
      if (!body.success) {
        throw new BadRequestError("Payload invalido para edicao de modelo.", body.error.flatten());
      }

      const output = await this.modelsService.update({
        id: params.data.id,
        ...body.data,
      });
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = modelIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new BadRequestError("Parametros invalidos para exclusao de modelo.", parsed.error.flatten());
      }

      await this.modelsService.delete(parsed.data.id);
      reply.status(204).send();
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
