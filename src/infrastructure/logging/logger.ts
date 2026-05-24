import type { FastifyBaseLogger, FastifyServerOptions } from "fastify";

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
export type LoggerEnv = {
  NODE_ENV: "development" | "test" | "production";
  LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";
};

export function createFastifyLoggerOptions(env: LoggerEnv): FastifyServerOptions["logger"] {
  if (env.NODE_ENV !== "development") {
    return {
      level: env.LOG_LEVEL,
    };
  }

  return {
    level: env.LOG_LEVEL,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        singleLine: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
      },
    },
  };
}

export function maskSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > 10 || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item, depth + 1));
  }

  if (typeof value === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      masked[key] = sensitiveKeys.has(key.toLowerCase())
        ? "***MASKED***"
        : maskSensitiveData(item, depth + 1);
    }
    return masked;
  }

  return value;
}

export function maskLogContext(context: LogContext): LogContext {
  const masked: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    masked[key] = sensitiveKeys.has(key.toLowerCase())
      ? "***MASKED***"
      : maskSensitiveData(value);
  }

  return masked;
}

export class StructuredLogger {
  constructor(private readonly logger: Pick<FastifyBaseLogger, "info" | "warn" | "error" | "debug">) {}

  info(message: string, context: LogContext = {}): void {
    this.logger.info(maskLogContext(context), message);
  }

  warn(message: string, context: LogContext = {}): void {
    this.logger.warn(maskLogContext(context), message);
  }

  error(message: string, context: LogContext = {}): void {
    this.logger.error(maskLogContext(context), message);
  }

  debug(message: string, context: LogContext = {}): void {
    this.logger.debug(maskLogContext(context), message);
  }
}
