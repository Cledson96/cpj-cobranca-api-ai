import type { FastifyInstance } from "fastify";
import { HealthController } from "@/modules/health/controllers/index.js";

export class HealthRoutes {
  private readonly controller: HealthController;

  constructor(controller = new HealthController()) {
    this.controller = controller;
  }

  register(app: FastifyInstance): void {
    app.get("/health", this.controller.show.bind(this.controller));
  }
}
