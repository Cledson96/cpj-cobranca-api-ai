import type { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestError, handleUnknownError } from "@/infrastructure/errors";
import {
  promptFlowParamsSchema,
  promptVersionActivateParamsSchema,
  promptVersionCreateRequestSchema,
  promptVersionListQuerySchema,
  promptVersionParamsSchema,
} from "@shared";
import type { PromptsService } from "../services";

export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = promptVersionListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new BadRequestError("Query invalida para listagem de prompts.", parsed.error.flatten());
      }

      const output = await this.promptsService.list(parsed.data);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async findActive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = promptFlowParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new BadRequestError("Parametros invalidos para prompt ativo.", parsed.error.flatten());
      }

      const output = await this.promptsService.findActive(parsed.data.flowType);
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async findVersion(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = promptVersionParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new BadRequestError("Parametros invalidos para versao de prompt.", parsed.error.flatten());
      }

      const output = await this.promptsService.findVersion({
        flow_type: parsed.data.flowType,
        version: parsed.data.version,
      });
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = promptVersionCreateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new BadRequestError("Payload invalido para cadastro de prompt.", parsed.error.flatten());
      }

      const output = await this.promptsService.create(parsed.data);
      reply.status(201).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  async activate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const parsed = promptVersionActivateParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        throw new BadRequestError("Parametros invalidos para ativacao de prompt.", parsed.error.flatten());
      }

      const output = await this.promptsService.activate({
        flow_type: parsed.data.flowType,
        version: parsed.data.version,
      });
      reply.status(200).send(output);
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
