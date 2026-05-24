import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { prismaPlugin } from "@/infrastructure/database";
import { HealthRoutes } from "@/modules/health/routes";
import { type AppEnv, loadEnv } from "@shared";
import {
  ErrorHandlerMiddleware,
  RequestContextMiddleware,
  SecurityMiddleware,
} from "@shared";

export type AppOptions = {
  env?: AppEnv;
  registerDatabase?: boolean;
  serverOptions?: FastifyServerOptions;
};

export class App {
  private readonly app: FastifyInstance;
  private readonly env: AppEnv;

  constructor(options: AppOptions = {}) {
    this.env = options.env ?? loadEnv();
    this.app = Fastify({
      bodyLimit: this.env.BODY_LIMIT_BYTES,
      logger: {
        level: this.env.LOG_LEVEL,
      },
      requestTimeout: this.env.REQUEST_TIMEOUT_MS,
      ...options.serverOptions,
    });
    RequestContextMiddleware.register(this.app);
    ErrorHandlerMiddleware.register(this.app);
    SecurityMiddleware.register(this.app, this.env);
    if (options.registerDatabase ?? true) {
      this.registerPlugins();
    }
    this.registerRoutes();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.env.PORT, host: this.env.HOST });
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  private registerRoutes(): void {
    new HealthRoutes().register(this.app);
  }

  private registerPlugins(): void {
    this.app.register(prismaPlugin);
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  return new App(options).instance;
}
