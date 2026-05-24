import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { HealthRoutes } from "@/modules/health/routes/index.js";

export class App {
  private readonly app: FastifyInstance;

  constructor(options: FastifyServerOptions = {}) {
    this.app = Fastify(options);
    this.registerRoutes();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  async start(port = 3000, host = "0.0.0.0"): Promise<void> {
    await this.app.listen({ port, host });
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  private registerRoutes(): void {
    new HealthRoutes().register(this.app);
  }
}

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  return new App(options).instance;
}
