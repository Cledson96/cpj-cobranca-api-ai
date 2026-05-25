import {
  pullRequestReviewRequestSchema,
  pullRequestReviewResponseSchema,
  reviewRequestSchema,
  reviewResponseSchema,
} from "@shared";
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

export const reviewStreamRouteDocs = {
  summary: "Executa code review automatizado com streaming SSE",
  description:
    "Analisa um trecho de codigo TypeScript, JavaScript ou Python e transmite em tempo real os passos da execucao via SSE (Server-Sent Events).",
  tags: ["Review"],
  body: toOpenApiSchema(reviewRequestSchema),
  response: {
    200: {
      description: "Conexao de stream estabelecida. Retorna eventos SSE (text/event-stream).",
      type: "string",
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "invalid_request" },
        message: { type: "string", example: "Payload invalido para stream de review." },
        details: { type: "object" },
      },
      required: ["error", "message"],
    },
    500: reviewRouteDocs.response[500],
  },
};

export const pullRequestReviewRouteDocs = {
  summary: "Executa review automatizado de pull request",
  description:
    "Busca um pull request no GitHub, compara com a branch base, avalia padroes TR, aderencia ao projeto, seguranca e criterios Jira opcionais.",
  tags: ["Review"],
  body: toOpenApiSchema(pullRequestReviewRequestSchema),
  response: {
    200: {
      description: "Review de pull request gerado com sucesso",
      ...toOpenApiSchema(pullRequestReviewResponseSchema),
    },
    400: reviewRouteDocs.response[400],
    500: reviewRouteDocs.response[500],
  },
};
