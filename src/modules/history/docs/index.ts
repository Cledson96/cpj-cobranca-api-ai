import {
  historyDetailParamsSchema,
  historyDetailSchema,
  historyListResponseSchema,
} from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

const notFoundResponse = {
  description: "Execucao nao encontrada",
  type: "object",
  properties: {
    error: { type: "string", example: "not_found" },
    message: { type: "string", example: "Execucao nao encontrada." },
  },
  required: ["error", "message"],
};

export const historyListRouteDocs = {
  summary: "Lista execucoes recentes",
  description: "Retorna execucoes recentes persistidas do fluxo de review.",
  tags: ["History"],
  response: {
    200: {
      description: "Historico retornado com sucesso",
      ...toOpenApiSchema(historyListResponseSchema),
    },
  },
};

export const historyDetailRouteDocs = {
  summary: "Busca execucao por id",
  description: "Retorna payload de entrada, saida, status e erro de uma execucao persistida.",
  tags: ["History"],
  params: toOpenApiSchema(historyDetailParamsSchema),
  response: {
    200: {
      description: "Execucao encontrada",
      ...toOpenApiSchema(historyDetailSchema),
    },
    404: notFoundResponse,
  },
};
