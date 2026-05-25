import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { prismaPlugin } from "@/infrastructure/database";
import { createFastifyLoggerOptions } from "@/infrastructure/logging";
import { OpenApiPlugin } from "@/infrastructure/openapi";
import { ComplianceRoutes, type ComplianceRoutesDependencies } from "@/modules/compliance";
import { DocumentRoutes, type DocumentRoutesDependencies } from "@/modules/document";
import { HealthRoutes } from "@/modules/health/routes";
import { HistoryRoutes, type HistoryRoutesDependencies } from "@/modules/history";
import { ReviewRoutes, type ReviewRoutesDependencies } from "@/modules/review";
import { type AppEnv, loadEnv } from "@shared";
import {
  ErrorHandlerMiddleware,
  RequestContextMiddleware,
  SecurityMiddleware,
} from "@shared";

export type AppDependencies = ComplianceRoutesDependencies &
  DocumentRoutesDependencies &
  ReviewRoutesDependencies &
  HistoryRoutesDependencies;

export type AppOptions = {
  dependencies?: AppDependencies;
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
      logger: createFastifyLoggerOptions(this.env),
      requestTimeout: this.env.REQUEST_TIMEOUT_MS,
      ...options.serverOptions,
    });
    RequestContextMiddleware.register(this.app);
    ErrorHandlerMiddleware.register(this.app);
    SecurityMiddleware.register(this.app, this.env);
    OpenApiPlugin.registerCollector(this.app);
    if (options.registerDatabase ?? true) {
      this.registerPlugins();
    }
    this.app.after(() => {
      this.registerRoutes(options.dependencies ?? {});
      OpenApiPlugin.registerUi(this.app);
    });
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

  private registerRoutes(dependencies: AppDependencies): void {
    new HealthRoutes().register(this.app);
    new ReviewRoutes(dependencies).register(this.app);
    new ComplianceRoutes(dependencies).register(this.app);
    new DocumentRoutes(dependencies).register(this.app);
    new HistoryRoutes(dependencies).register(this.app);
  }

  private registerPlugins(): void {
    this.app.register(prismaPlugin);
  }
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  return new App(options).instance;
}
