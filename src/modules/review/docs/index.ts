import { reviewRequestSchema, reviewResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

export const reviewRouteDocs = {
  summary: "Executa code review automatizado",
  description:
    "Analisa um trecho de codigo TypeScript, JavaScript ou Python e retorna qualidade geral, score, problemas, pontos positivos e resumo.",
  tags: ["Review"],
  body: toOpenApiSchema(reviewRequestSchema),
  response: {
    200: {
      description: "Review gerado com sucesso",
      ...toOpenApiSchema(reviewResponseSchema),
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "invalid_request" },
        message: { type: "string", example: "Payload invalido para code review." },
        details: { type: "object" },
      },
      required: ["error", "message"],
    },
    500: {
      description: "Erro interno do servidor",
      type: "object",
      properties: {
        error: { type: "string", example: "internal_server_error" },
        message: { type: "string", example: "Erro inesperado" },
      },
      required: ["error", "message"],
    },
  },
};
