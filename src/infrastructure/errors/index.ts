export abstract class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code: string;
  readonly cause?: unknown;

  protected constructor(input: {
    code: string;
    message: string;
    statusCode?: number;
    isOperational?: boolean;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = this.constructor.name;
    this.code = input.code;
    this.statusCode = input.statusCode ?? 500;
    this.isOperational = input.isOperational ?? true;
    this.cause = input.cause;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisicao invalida", cause?: unknown) {
    super({
      code: "bad_request",
      message,
      statusCode: 400,
      cause,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso nao encontrado", cause?: unknown) {
    super({
      code: "not_found",
      message,
      statusCode: 404,
      cause,
    });
  }
}

export class GenericError extends AppError {
  constructor(message = "Erro interno desconhecido", cause?: unknown) {
    super({
      code: "generic_error",
      message,
      statusCode: 500,
      isOperational: false,
      cause,
    });
  }
}

export function handleUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new GenericError(error.message, error);
  }

  return new GenericError("Erro interno desconhecido", error);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
