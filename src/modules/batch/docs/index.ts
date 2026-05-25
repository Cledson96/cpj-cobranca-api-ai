import { batchResponseSchema } from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

const batchRequestOpenApiSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          flow_type: {
            type: "string",
            enum: ["review", "compliance", "document", "tests"],
          },
          payload: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["flow_type", "payload"],
      },
    },
    continue_on_error: {
      type: "boolean",
      default: true,
    },
    notify: {
      type: "boolean",
      default: false,
    },
  },
  required: ["items"],
};

export const batchRouteDocs = {
  summary: "Executa multiplos fluxos de analise em lote",
  description:
    "Recebe uma lista de itens para review, compliance, documentacao ou geracao de testes e retorna o resultado consolidado.",
  tags: ["Batch"],
  body: batchRequestOpenApiSchema,
  response: {
    200: {
      description: "Batch executado com sucesso",
      ...toOpenApiSchema(batchResponseSchema),
    },
    400: {
      description: "Erro de validacao do payload",
      type: "object",
      properties: {
        error: { type: "string", example: "bad_request" },
        message: { type: "string", example: "Payload invalido para batch." },
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
