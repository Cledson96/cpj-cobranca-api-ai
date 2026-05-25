import type { FastifyInstance } from "fastify";
import { ComplianceController } from "@/modules/compliance/controllers";
import { complianceRouteDocs } from "@/modules/compliance/docs";
import { DefaultComplianceService, type ComplianceService } from "@/modules/compliance/services";

export type ComplianceRoutesDependencies = {
  complianceService?: ComplianceService;
};

export class ComplianceRoutes {
  private readonly dependencies: ComplianceRoutesDependencies;

  constructor(dependencies: ComplianceRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new ComplianceController(this.createComplianceService());

    app.post(
      "/api/v1/compliance",
      {
        attachValidation: true,
        schema: complianceRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createComplianceService(): ComplianceService {
    return this.dependencies.complianceService ?? new DefaultComplianceService();
  }
}
