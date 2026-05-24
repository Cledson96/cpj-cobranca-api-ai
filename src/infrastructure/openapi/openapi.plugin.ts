import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export class OpenApiPlugin {
  static registerCollector(app: FastifyInstance): void {
    app.register(swagger, {
      openapi: {
        info: {
          title: "CPJ-Cobranca API AI",
          description: "API do case CPJ-Cobranca com agente de IA para apoio ao processo de desenvolvimento.",
          version: "0.1.0",
        },
        tags: [
          {
            name: "Review",
            description: "Code review automatizado com IA",
          },
        ],
      },
    });
  }

  static registerUi(app: FastifyInstance): void {
    app.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });
  }
}
