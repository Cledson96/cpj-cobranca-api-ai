import type { FastifyInstance, FastifyRequest } from "fastify";

const startedAtByRequest = new WeakMap<FastifyRequest, number>();

export class RequestContextMiddleware {
  static register(app: FastifyInstance): void {
    app.addHook("onRequest", async (request, reply) => {
      startedAtByRequest.set(request, Date.now());
      reply.header("x-request-id", request.id);
    });

    app.addHook("onResponse", async (request, reply) => {
      const startedAt = startedAtByRequest.get(request);
      const durationMs = startedAt ? Date.now() - startedAt : 0;

      request.log.info(
        {
          request_id: request.id,
          method: request.method,
          url: request.url,
          status: reply.statusCode,
          duration_ms: durationMs,
        },
        "request completed",
      );
    });
  }
}
