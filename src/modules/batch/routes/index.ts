import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository, ReviewExecutionRepository } from "@/modules/executions";
import { BatchController } from "@/modules/batch/controllers";
import { batchRouteDocs } from "@/modules/batch/docs";
import { BatchExecutionRepository } from "@/modules/batch/repositories";
import { DefaultBatchService, type BatchService } from "@/modules/batch/services";
import { DefaultComplianceService } from "@/modules/compliance/services";
import { DefaultDocumentService } from "@/modules/document/services";
import { DefaultReviewService } from "@/modules/review/services";
import { DefaultTestsService } from "@/modules/tests/services";
import type {
  ComplianceRequest,
  ComplianceResponse,
  DocumentRequest,
  DocumentResponse,
  TestsRequest,
  TestsResponse,
} from "@shared";

export type BatchRoutesDependencies = {
  batchService?: BatchService;
};

export class BatchRoutes {
  private readonly dependencies: BatchRoutesDependencies;

  constructor(dependencies: BatchRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new BatchController(this.createBatchService(app));

    app.post(
      "/api/v1/batch",
      {
        attachValidation: true,
        schema: batchRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createBatchService(app: FastifyInstance): BatchService {
    if (this.dependencies.batchService) {
      return this.dependencies.batchService;
    }

    if ("prisma" in app) {
      return new DefaultBatchService({
        reviewService: new DefaultReviewService({
          executionPersistence: new ReviewExecutionRepository(app.prisma),
        }),
        complianceService: new DefaultComplianceService({
          executionPersistence: new AgentExecutionRepository<ComplianceRequest, ComplianceResponse>(
            app.prisma,
            "compliance",
          ),
        }),
        documentService: new DefaultDocumentService({
          executionPersistence: new AgentExecutionRepository<DocumentRequest, DocumentResponse>(
            app.prisma,
            "document",
          ),
        }),
        testsService: new DefaultTestsService({
          executionPersistence: new AgentExecutionRepository<TestsRequest, TestsResponse>(
            app.prisma,
            "tests",
          ),
        }),
        batchRepository: new BatchExecutionRepository(app.prisma),
      });
    }

    return new DefaultBatchService({
      reviewService: new DefaultReviewService(),
      complianceService: new DefaultComplianceService(),
      documentService: new DefaultDocumentService(),
      testsService: new DefaultTestsService(),
    });
  }
}
