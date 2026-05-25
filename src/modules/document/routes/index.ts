import type { FastifyInstance } from "fastify";
import { DocumentController } from "@/modules/document/controllers";
import { documentRouteDocs } from "@/modules/document/docs";
import { DefaultDocumentService, type DocumentService } from "@/modules/document/services";

export type DocumentRoutesDependencies = {
  documentService?: DocumentService;
};

export class DocumentRoutes {
  private readonly dependencies: DocumentRoutesDependencies;

  constructor(dependencies: DocumentRoutesDependencies = {}) {
    this.dependencies = dependencies;
  }

  register(app: FastifyInstance): void {
    const controller = new DocumentController(this.createDocumentService());

    app.post(
      "/api/v1/document",
      {
        attachValidation: true,
        schema: documentRouteDocs,
      },
      controller.execute.bind(controller),
    );
  }

  private createDocumentService(): DocumentService {
    return this.dependencies.documentService ?? new DefaultDocumentService();
  }
}
