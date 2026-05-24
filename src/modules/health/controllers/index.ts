import type { FastifyReply, FastifyRequest } from "fastify";

export class HealthController {
  async show(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send({
      status: "ok",
      service: "cpj-cobranca-api-ai",
      timestamp: new Date().toISOString(),
    });
  }
}
