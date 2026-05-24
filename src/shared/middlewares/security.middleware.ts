import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "@shared";

export class SecurityMiddleware {
  static register(app: FastifyInstance, env: AppEnv): void {
    app.register(helmet);
    app.register(cors, {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    });
    app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
    });
  }
}
