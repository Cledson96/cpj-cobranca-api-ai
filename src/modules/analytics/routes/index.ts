import type { FastifyInstance } from "fastify";
import { GenericError } from "@/infrastructure/errors";
import { AnalyticsController } from "../controllers";
import { analyticsUsageRouteDocs } from "../docs";
import { PrismaAnalyticsRepository } from "../repositories/analytics.repository";
import { DefaultAnalyticsService, type AnalyticsService } from "../services";

export type AnalyticsRoutesDependencies = {
  analyticsService?: AnalyticsService;
};

export class AnalyticsRoutes {
  constructor(private readonly dependencies: AnalyticsRoutesDependencies = {}) {}

  register(app: FastifyInstance): void {
    const controller = new AnalyticsController(this.createAnalyticsService(app));

    app.get(
      "/api/v1/analytics/usage",
      { attachValidation: true, schema: analyticsUsageRouteDocs },
      controller.getUsage.bind(controller),
    );
  }

  private createAnalyticsService(app: FastifyInstance): AnalyticsService {
    if (this.dependencies.analyticsService) {
      return this.dependencies.analyticsService;
    }

    if ("prisma" in app) {
      return new DefaultAnalyticsService(new PrismaAnalyticsRepository(app.prisma));
    }

    return new DefaultAnalyticsService({
      async listUsageRecords() {
        throw new GenericError("Repositorio de analytics nao configurado.");
      },
    });
  }
}
