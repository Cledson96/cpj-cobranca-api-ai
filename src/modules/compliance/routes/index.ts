import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository } from "@/modules/executions";
import { DefaultPromptsService, PrismaPromptVersionRepository, type PromptRuntimeResolver } from "@/modules/prompts";
import { ComplianceController } from "@/modules/compliance/controllers";
import { complianceRouteDocs } from "@/modules/compliance/docs";
import { DefaultComplianceService, type ComplianceService } from "@/modules/compliance/services";
import type { ComplianceRequest, ComplianceResponse } from "@shared";

export type ComplianceRoutesDependencies = {
  complianceService?: ComplianceService;
  promptResolver?: PromptRuntimeResolver;
};

export class ComplianceRoutes {
  private readonly dependencies: ComplianceRoutesDependencies;

  constructor(dependencies: ComplianceRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new ComplianceController(this.createComplianceService(app));

    app.post(
      "/api/v1/compliance",
      {
        attachValidation: true,
        schema: complianceRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createComplianceService(app: FastifyInstance): ComplianceService {
    if (this.dependencies.complianceService) {
      return this.dependencies.complianceService;
    }

    if ("prisma" in app) {
      const promptResolver = this.dependencies.promptResolver
        ?? new DefaultPromptsService(new PrismaPromptVersionRepository(app.prisma));

      return new DefaultComplianceService({
        executionPersistence: new AgentExecutionRepository<ComplianceRequest, ComplianceResponse>(
          app.prisma,
          "compliance",
        ),
        promptResolver,
      });
    }

    return new DefaultComplianceService();
  }
}
