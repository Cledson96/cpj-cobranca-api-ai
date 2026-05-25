import {
  modelCreateRequestSchema,
  modelDetailSchema,
  modelIdParamsSchema,
  modelListResponseSchema,
  modelUpdateRequestSchema,
} from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

const notFoundResponse = {
  description: "Modelo nao encontrado",
  type: "object",
  properties: {
    error: { type: "string", example: "not_found" },
    message: { type: "string", example: "Modelo nao encontrado." },
  },
  required: ["error", "message"],
};

const badRequestResponse = {
  description: "Payload ou parametros invalidos",
  type: "object",
  properties: {
    error: { type: "string", example: "bad_request" },
    message: { type: "string", example: "Payload invalido para cadastro de modelo." },
  },
  required: ["error", "message"],
};

export const modelsListRouteDocs = {
  summary: "Lista modelos cadastrados",
  tags: ["Models"],
  response: {
    200: {
      description: "Modelos listados com sucesso",
      ...toOpenApiSchema(modelListResponseSchema),
    },
  },
};

export const modelsDefaultRouteDocs = {
  summary: "Busca modelo padrao global",
  tags: ["Models"],
  response: {
    200: {
      description: "Modelo padrao encontrado",
      ...toOpenApiSchema(modelDetailSchema),
    },
    404: notFoundResponse,
  },
};

export const modelsCreateRouteDocs = {
  summary: "Cadastra modelo",
  tags: ["Models"],
  body: toOpenApiSchema(modelCreateRequestSchema),
  response: {
    201: {
      description: "Modelo criado com sucesso",
      ...toOpenApiSchema(modelDetailSchema),
    },
    400: badRequestResponse,
  },
};

export const modelsUpdateRouteDocs = {
  summary: "Edita modelo",
  tags: ["Models"],
  params: toOpenApiSchema(modelIdParamsSchema),
  body: toOpenApiSchema(modelUpdateRequestSchema),
  response: {
    200: {
      description: "Modelo atualizado com sucesso",
      ...toOpenApiSchema(modelDetailSchema),
    },
    400: badRequestResponse,
    404: notFoundResponse,
  },
};

export const modelsDeleteRouteDocs = {
  summary: "Exclui modelo",
  tags: ["Models"],
  params: toOpenApiSchema(modelIdParamsSchema),
  response: {
    204: {
      description: "Modelo excluido com sucesso",
      type: "null",
    },
    400: badRequestResponse,
    404: notFoundResponse,
  },
};
