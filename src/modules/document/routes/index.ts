import type { FastifyInstance } from "fastify";
import { AgentExecutionRepository } from "@/modules/executions";
import { DocumentController } from "@/modules/document/controllers";
import { documentRouteDocs } from "@/modules/document/docs";
import { DefaultDocumentService, type DocumentService } from "@/modules/document/services";
import type { DocumentRequest, DocumentResponse } from "@shared";

export type DocumentRoutesDependencies = {
  documentService?: DocumentService;
};

export class DocumentRoutes {
  private readonly dependencies: DocumentRoutesDependencies;

  constructor(dependencies: DocumentRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new DocumentController(this.createDocumentService(app));

    app.post(
      "/api/v1/document",
      {
        attachValidation: true,
        schema: documentRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createDocumentService(app: FastifyInstance): DocumentService {
    if (this.dependencies.documentService) {
      return this.dependencies.documentService;
    }

    if ("prisma" in app) {
      return new DefaultDocumentService({
        executionPersistence: new AgentExecutionRepository<DocumentRequest, DocumentResponse>(
          app.prisma,
          "document",
        ),
      });
    }

    return new DefaultDocumentService();
  }
}
