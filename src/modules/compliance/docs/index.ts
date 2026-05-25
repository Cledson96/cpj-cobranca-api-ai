import { complianceRequestSchema, complianceResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

export const complianceRouteDocs = {
  summary: "Executa avaliacao de aderencia a tarefa",
  description:
    "Compara a descricao da tarefa com o codigo implementado e retorna requisitos cobertos, lacunas, itens parciais e veredito.",
  tags: ["Compliance"],
  body: toOpenApiSchema(complianceRequestSchema),
  response: {
    200: {
      description: "Avaliacao de aderencia gerada com sucesso",
      ...toOpenApiSchema(complianceResponseSchema),
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "bad_request" },
        message: { type: "string", example: "Payload invalido para avaliacao de aderencia." },
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
