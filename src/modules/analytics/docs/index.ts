import { toOpenApiSchema } from "@/infrastructure/openapi";
import {
  analyticsUsageQuerySchema,
  analyticsUsageResponseSchema,
} from "@shared";

export const analyticsUsageRouteDocs = {
  summary: "Agrega consumo e custos",
  description: "Retorna totais de execucoes, tokens e custo em USD agrupados por dia, fluxo e modelo.",
  tags: ["Analytics"],
  querystring: toOpenApiSchema(analyticsUsageQuerySchema),
  response: {
    200: {
      description: "Uso agregado retornado com sucesso",
      ...toOpenApiSchema(analyticsUsageResponseSchema),
    },
  },
};
