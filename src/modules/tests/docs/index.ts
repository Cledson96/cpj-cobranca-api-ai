import { testsRequestSchema, testsResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

export const testsRouteDocs = {
  summary: "Gera sugestoes e codigo de testes para um codigo",
  description:
    "Analisa codigo-fonte e retorna estrategia, casos de teste, codigo de teste gerado e lacunas de inferencia.",
  tags: ["Tests"],
  body: toOpenApiSchema(testsRequestSchema),
  response: {
    200: {
      description: "Testes gerados com sucesso",
      ...toOpenApiSchema(testsResponseSchema),
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "bad_request" },
        message: { type: "string", example: "Payload invalido para geracao de testes." },
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
