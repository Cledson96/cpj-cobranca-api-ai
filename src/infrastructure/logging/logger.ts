import type { FastifyBaseLogger } from "fastify";

const sensitiveKeys = new Set([
  "api_key",
  "apikey",
  "authorization",
  "bearer",
  "client_secret",
  "credentials",
  "openrouter_api_key",
  "langsmith_api_key",
  "password",
  "private_key",
  "refresh_token",
  "secret",
  "senha",
  "token",
]);

export type LogContext = Record<string, unknown>;

export function maskSensitiveData<T>(value: T, depth = 0): T {
  if (depth > 10 || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item, depth + 1)) as T;
  }

  if (typeof value === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      masked[key] = sensitiveKeys.has(key.toLowerCase())
        ? "***MASKED***"
        : maskSensitiveData(item, depth + 1);
    }
    return masked as T;
  }

  return value;
}

export class StructuredLogger {
  constructor(private readonly logger: Pick<FastifyBaseLogger, "info" | "warn" | "error" | "debug">) {}

  info(message: string, context: LogContext = {}): void {
    this.logger.info(maskSensitiveData(context), message);
  }

  warn(message: string, context: LogContext = {}): void {
    this.logger.warn(maskSensitiveData(context), message);
  }

  error(message: string, context: LogContext = {}): void {
    this.logger.error(maskSensitiveData(context), message);
  }

  debug(message: string, context: LogContext = {}): void {
    this.logger.debug(maskSensitiveData(context), message);
  }
}
