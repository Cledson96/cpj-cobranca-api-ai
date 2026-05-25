import { documentRequestSchema, documentResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

export const documentRouteDocs = {
  summary: "Gera documentacao tecnica a partir de codigo",
  description:
    "Analisa codigo-fonte e retorna documentacao estruturada em Markdown, API publica, exemplos e lacunas de inferencia.",
  tags: ["Document"],
  body: toOpenApiSchema(documentRequestSchema),
  response: {
    200: {
      description: "Documentacao gerada com sucesso",
      ...toOpenApiSchema(documentResponseSchema),
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "bad_request" },
        message: { type: "string", example: "Payload invalido para documentacao." },
        details: { type: "object" },
      },
      required: ["error", "message"],
    },
    500: {
      description: "Erro interno do servidor",
      type: "object",
      properties: {
        error: { type: "string", example: "generic_error" },
        message: { type: "string", example: "Erro inesperado" },
      },
      required: ["error", "message"],
    },
  },
};
