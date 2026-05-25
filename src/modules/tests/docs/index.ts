import { pullRequestTestsRequestSchema, testsRequestSchema, testsResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

export const testsRouteDocs = {
  summary: "Gera sugestoes e codigo de testes para um codigo",
  description:
    "Analisa codigo-fonte e retorna arquivo de teste, casos classificados e dicas de cobertura.",
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

export const pullRequestTestsRouteDocs = {
  summary: "Gera testes unitarios a partir de um pull request",
  description:
    "Busca um pull request no GitHub, identifica funcoes criticas alteradas e retorna arquivo de testes unitarios focado no framework informado.",
  tags: ["Tests"],
  body: toOpenApiSchema(pullRequestTestsRequestSchema),
  response: testsRouteDocs.response,
};
