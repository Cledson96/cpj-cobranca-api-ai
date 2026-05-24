import type { FastifyInstance } from "fastify";
import { isAppError } from "@/infrastructure/errors";

export class ErrorHandlerMiddleware {
  static register(app: FastifyInstance): void {
    app.setErrorHandler((error, request, reply) => {
      const statusCode = getStatusCode(error);
      if (statusCode >= 500) {
        request.log.error({ error, request_id: request.id }, "unhandled api error");
      }

      reply.status(statusCode).send({
        error: getErrorCode(error, statusCode),
        message: getErrorMessage(error, statusCode),
      });
    });
  }
}

function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }

  if (hasValidStatusCode(error)) {
    return error.statusCode;
  }

  return 500;
}

function getErrorCode(error: unknown, statusCode: number): string {
  if (isAppError(error)) {
    return error.code;
  }

  if (hasStringCode(error)) {
    return error.code.toLowerCase();
  }

  return statusCode >= 500 ? "internal_server_error" : "request_error";
}

function getErrorMessage(error: unknown, statusCode: number): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (statusCode >= 500) {
    return "Erro inesperado";
  }

  return error instanceof Error ? error.message : "Requisicao invalida";
}

function hasValidStatusCode(error: unknown): error is { statusCode: number } {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return false;
  }

  return (
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  );
}

function hasStringCode(error: unknown): error is { code: string } {
  return Boolean(error && typeof error === "object" && "code" in error && typeof error.code === "string");
}
