import type { FastifyError, FastifyInstance } from "fastify";

export class ErrorHandlerMiddleware {
  static register(app: FastifyInstance): void {
    app.setErrorHandler((error, request, reply) => {
      const statusCode = getStatusCode(error);
      if (statusCode >= 500) {
        request.log.error({ error, request_id: request.id }, "unhandled api error");
      }

      reply.status(statusCode).send({
        error: statusCode >= 500 ? "internal_server_error" : normalizeErrorCode(error),
        message: statusCode >= 500 ? "Erro inesperado" : getErrorMessage(error),
      });
    });
  }
}

function getStatusCode(error: unknown): number {
  const statusCode = (error as Partial<FastifyError>).statusCode;
  return statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500;
}

function normalizeErrorCode(error: unknown): string {
  const code = (error as Partial<FastifyError>).code;
  return code ? code.toLowerCase() : "request_error";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Requisicao invalida";
}
