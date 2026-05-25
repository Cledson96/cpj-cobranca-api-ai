import {
  promptFlowParamsSchema,
  promptVersionCreateRequestSchema,
  promptVersionDetailSchema,
  promptVersionListQuerySchema,
  promptVersionListResponseSchema,
  promptVersionParamsSchema,
} from "@shared";
import { toOpenApiSchema } from "@/infrastructure/openapi";

const notFoundResponse = {
  description: "Prompt nao encontrado",
  type: "object",
  properties: {
    error: { type: "string", example: "not_found" },
    message: { type: "string", example: "Versao de prompt nao encontrada." },
  },
  required: ["error", "message"],
};

const badRequestResponse = {
  description: "Payload ou parametros invalidos",
  type: "object",
  properties: {
    error: { type: "string", example: "bad_request" },
    message: { type: "string", example: "Payload invalido para cadastro de prompt." },
  },
  required: ["error", "message"],
};

export const promptsListRouteDocs = {
  summary: "Lista versoes de prompts por fluxo",
  tags: ["Prompts"],
  querystring: toOpenApiSchema(promptVersionListQuerySchema),
  response: {
    200: {
      description: "Prompts listados com sucesso",
      ...toOpenApiSchema(promptVersionListResponseSchema),
    },
    400: badRequestResponse,
  },
};

export const promptsActiveRouteDocs = {
  summary: "Busca prompt ativo do fluxo",
  tags: ["Prompts"],
  params: toOpenApiSchema(promptFlowParamsSchema),
  response: {
    200: {
      description: "Prompt ativo encontrado",
      ...toOpenApiSchema(promptVersionDetailSchema),
    },
    404: notFoundResponse,
  },
};

export const promptsDetailRouteDocs = {
  summary: "Busca versao especifica de prompt",
  tags: ["Prompts"],
  params: toOpenApiSchema(promptVersionParamsSchema),
  response: {
    200: {
      description: "Versao de prompt encontrada",
      ...toOpenApiSchema(promptVersionDetailSchema),
    },
    404: notFoundResponse,
  },
};

export const promptsCreateRouteDocs = {
  summary: "Cadastra nova versao de prompt",
  tags: ["Prompts"],
  body: toOpenApiSchema(promptVersionCreateRequestSchema),
  response: {
    201: {
      description: "Prompt criado com sucesso",
      ...toOpenApiSchema(promptVersionDetailSchema),
    },
    400: badRequestResponse,
  },
};

export const promptsActivateRouteDocs = {
  summary: "Ativa versao de prompt do fluxo",
  tags: ["Prompts"],
  params: toOpenApiSchema(promptVersionParamsSchema),
  response: {
    200: {
      description: "Prompt ativado com sucesso",
      ...toOpenApiSchema(promptVersionDetailSchema),
    },
    400: badRequestResponse,
    404: notFoundResponse,
  },
};
