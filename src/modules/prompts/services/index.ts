import { BadRequestError, GenericError, NotFoundError } from "@/infrastructure/errors";
import { CompliancePromptCatalog } from "@/modules/compliance/prompts";
import { DocumentPromptCatalog } from "@/modules/document/prompts";
import { ReviewPromptCatalog } from "@/modules/review/prompts";
import { TestsPromptCatalog } from "@/modules/tests/prompts";
import type {
  PromptBlockKey,
  PromptFlowType,
  PromptVersionCreateRequest,
  PromptVersionDetail,
  PromptVersionListResponse,
} from "@shared";
import type {
  PromptVersionIdentifier,
  PromptVersionListInput,
  PromptVersionRecord,
  PullRequestReviewRuntimePromptSet,
  ReviewRuntimePromptSet,
  SimpleRuntimePromptSet,
} from "../models";
import {
  toPromptVersionDetail,
  toPromptVersionListResponse,
} from "../models";

const REVIEW_REQUIRED_BLOCKS: PromptBlockKey[] = [
  "naming_clarity",
  "error_handling",
  "resource_leak",
  "complexity",
  "security",
  "aggregator",
];

const SIMPLE_REQUIRED_BLOCKS: PromptBlockKey[] = ["agent"];
const PULL_REQUEST_REVIEW_REQUIRED_BLOCKS: PromptBlockKey[] = [
  "code_standard",
  "jira_criteria",
  "project_consistency",
  "security",
  "aggregator",
];

export interface PromptsService {
  list(input: PromptVersionListInput): Promise<PromptVersionListResponse>;
  findActive(flowType: PromptFlowType): Promise<PromptVersionDetail>;
  findVersion(input: PromptVersionIdentifier): Promise<PromptVersionDetail>;
  create(input: PromptVersionCreateRequest): Promise<PromptVersionDetail>;
  activate(input: PromptVersionIdentifier): Promise<PromptVersionDetail>;
}

export interface PromptRuntimeResolver {
  resolveReview(promptVersion?: number): Promise<ReviewRuntimePromptSet>;
  resolveCompliance(promptVersion?: number): Promise<SimpleRuntimePromptSet>;
  resolveDocument(promptVersion?: number): Promise<SimpleRuntimePromptSet>;
  resolveTests(promptVersion?: number): Promise<SimpleRuntimePromptSet>;
  resolvePullRequestReview(promptVersion?: number): Promise<PullRequestReviewRuntimePromptSet>;
}

export type PromptVersionRepository = {
  list(input: PromptVersionListInput): Promise<PromptVersionRecord[]>;
  findActive(flowType: PromptFlowType): Promise<PromptVersionRecord | null>;
  findVersion(input: PromptVersionIdentifier): Promise<PromptVersionRecord | null>;
  create(input: PromptVersionCreateRequest & { version: number }): Promise<PromptVersionRecord>;
  activate(input: PromptVersionIdentifier): Promise<PromptVersionRecord | null>;
  getNextVersion(flowType: PromptFlowType): Promise<number>;
};

export class DefaultPromptsService implements PromptsService, PromptRuntimeResolver {
  constructor(private readonly repository?: PromptVersionRepository) { }

  async list(input: PromptVersionListInput): Promise<PromptVersionListResponse> {
    const records = await this.getRepository().list(input);
    return toPromptVersionListResponse(records);
  }

  async findActive(flowType: PromptFlowType): Promise<PromptVersionDetail> {
    const record = await this.getRepository().findActive(flowType);
    if (!record) {
      throw new NotFoundError("Prompt ativo nao encontrado.");
    }

    return toPromptVersionDetail(record);
  }

  async findVersion(input: PromptVersionIdentifier): Promise<PromptVersionDetail> {
    const record = await this.getRepository().findVersion(input);
    if (!record) {
      throw new NotFoundError("Versao de prompt nao encontrada.");
    }

    return toPromptVersionDetail(record);
  }

  async create(input: PromptVersionCreateRequest): Promise<PromptVersionDetail> {
    this.validateBlocks(input.flow_type, input.blocks.map((block) => block.block_key));
    const repository = this.getRepository();
    const version = await repository.getNextVersion(input.flow_type);
    const record = await repository.create({ ...input, version });
    return toPromptVersionDetail(record);
  }

  async activate(input: PromptVersionIdentifier): Promise<PromptVersionDetail> {
    const repository = this.getRepository();
    const record = await repository.findVersion(input);
    if (!record) {
      throw new NotFoundError("Versao de prompt nao encontrada.");
    }

    this.validateBlocks(record.flow_type, record.blocks.map((block) => block.block_key));
    const activated = await repository.activate(input);
    if (!activated) {
      throw new NotFoundError("Versao de prompt nao encontrada.");
    }

    return toPromptVersionDetail(activated);
  }

  async resolveReview(promptVersion?: number): Promise<ReviewRuntimePromptSet> {
    const record = await this.resolveRecord("review", promptVersion);
    this.validateBlocks(record.flow_type, record.blocks.map((block) => block.block_key));

    const blockMap = new Map(record.blocks.map((block) => [block.block_key, block.system_prompt]));
    return {
      naming_clarity: requireBlock(blockMap, "naming_clarity"),
      error_handling: requireBlock(blockMap, "error_handling"),
      resource_leak: requireBlock(blockMap, "resource_leak"),
      complexity: requireBlock(blockMap, "complexity"),
      security: requireBlock(blockMap, "security"),
      aggregator: requireBlock(blockMap, "aggregator"),
    };
  }

  async resolveCompliance(promptVersion?: number): Promise<SimpleRuntimePromptSet> {
    return this.resolveSimpleFlow("compliance", promptVersion);
  }

  async resolveDocument(promptVersion?: number): Promise<SimpleRuntimePromptSet> {
    return this.resolveSimpleFlow("document", promptVersion);
  }

  async resolveTests(promptVersion?: number): Promise<SimpleRuntimePromptSet> {
    return this.resolveSimpleFlow("tests", promptVersion);
  }

  async resolvePullRequestReview(promptVersion?: number): Promise<PullRequestReviewRuntimePromptSet> {
    const record = await this.resolveRecord("pull_request_review", promptVersion);
    this.validateBlocks(record.flow_type, record.blocks.map((block) => block.block_key));

    const blockMap = new Map(record.blocks.map((block) => [block.block_key, block.system_prompt]));
    return {
      code_standard: requireBlock(blockMap, "code_standard"),
      jira_criteria: requireBlock(blockMap, "jira_criteria"),
      project_consistency: requireBlock(blockMap, "project_consistency"),
      security: requireBlock(blockMap, "security"),
      aggregator: requireBlock(blockMap, "aggregator"),
    };
  }

  private async resolveSimpleFlow(
    flowType: Exclude<PromptFlowType, "review" | "pull_request_review">,
    promptVersion?: number,
  ): Promise<SimpleRuntimePromptSet> {
    const record = await this.resolveRecord(flowType, promptVersion);
    this.validateBlocks(record.flow_type, record.blocks.map((block) => block.block_key));
    const block = record.blocks.find((item) => item.block_key === "agent");
    if (!block) {
      throw new GenericError(`Prompt do fluxo ${flowType} sem bloco agent.`);
    }

    return { agent: block.system_prompt };
  }

  private async resolveRecord(flowType: PromptFlowType, promptVersion?: number): Promise<PromptVersionRecord> {
    const repository = this.getRepository();
    const record = promptVersion
      ? await repository.findVersion({ flow_type: flowType, version: promptVersion })
      : await repository.findActive(flowType);

    if (!record) {
      throw new NotFoundError(
        promptVersion
          ? "Versao de prompt nao encontrada."
          : "Prompt ativo nao encontrado.",
      );
    }

    return record;
  }

  private validateBlocks(flowType: PromptFlowType, blockKeys: PromptBlockKey[]): void {
    const requiredBlocks = flowType === "review"
      ? REVIEW_REQUIRED_BLOCKS
      : flowType === "pull_request_review"
        ? PULL_REQUEST_REVIEW_REQUIRED_BLOCKS
        : SIMPLE_REQUIRED_BLOCKS;
    const uniqueBlockKeys = new Set(blockKeys);

    if (uniqueBlockKeys.size !== blockKeys.length) {
      throw new BadRequestError("Blocos de prompt duplicados nao sao permitidos.");
    }

    if (flowType === "review") {
      const missingBlocks = requiredBlocks.filter((blockKey) => !uniqueBlockKeys.has(blockKey));
      if (missingBlocks.length > 0) {
        throw new BadRequestError(`Prompt de review incompleto. Blocos ausentes: ${missingBlocks.join(", ")}.`);
      }
      return;
    }

    if (flowType === "pull_request_review") {
      const missingBlocks = requiredBlocks.filter((blockKey) => !uniqueBlockKeys.has(blockKey));
      if (missingBlocks.length > 0) {
        throw new BadRequestError(`Prompt de pull_request_review incompleto. Blocos ausentes: ${missingBlocks.join(", ")}.`);
      }
      return;
    }

    if (uniqueBlockKeys.size !== 1 || !uniqueBlockKeys.has("agent")) {
      throw new BadRequestError(`Fluxo ${flowType} exige apenas o bloco agent.`);
    }
  }

  private getRepository(): PromptVersionRepository {
    if (!this.repository) {
      throw new GenericError("Repositorio de prompts nao configurado.");
    }

    return this.repository;
  }
}

function requireBlock(
  blockMap: Map<PromptBlockKey, string>,
  blockKey: PromptBlockKey,
): string {
  const prompt = blockMap.get(blockKey);
  if (!prompt) {
    throw new GenericError(`Prompt ${blockKey} ausente no conjunto de review.`);
  }

  return prompt;
}

export class LegacyPromptRuntimeResolver implements PromptRuntimeResolver {
  async resolveReview(): Promise<ReviewRuntimePromptSet> {
    const templates = ReviewPromptCatalog.defaultTemplates();
    return {
      naming_clarity: templates.specialists.naming_clarity,
      error_handling: templates.specialists.error_handling,
      resource_leak: templates.specialists.resource_leak,
      complexity: templates.specialists.complexity,
      security: templates.specialists.security,
      aggregator: templates.aggregator,
    };
  }

  async resolveCompliance(): Promise<SimpleRuntimePromptSet> {
    return { agent: CompliancePromptCatalog.defaultTemplate() };
  }

  async resolveDocument(): Promise<SimpleRuntimePromptSet> {
    return { agent: DocumentPromptCatalog.defaultTemplate() };
  }

  async resolveTests(): Promise<SimpleRuntimePromptSet> {
    return { agent: TestsPromptCatalog.defaultTemplate() };
  }

  async resolvePullRequestReview(): Promise<PullRequestReviewRuntimePromptSet> {
    return defaultPullRequestReviewPrompts();
  }
}

export function defaultPullRequestReviewPrompts(): PullRequestReviewRuntimePromptSet {
  return {
    code_standard: [
      "Voce e um revisor senior. Avalie se o PR segue os padroes corporativos (Clean Code, SOLID, DDD).",
      "Use os guias de padrao recebidos como fonte da verdade.",
      "Identifique violações objetivas: nomenclatura, complexidade desnecessaria, falta de modularizacao ou tratamento de erro omisso.",
      "Retorne achados estruturados com arquivo, linha (se disponivel), descricao tecnica e sugestao concreta de refatoracao."
    ].join("\n"),

    jira_criteria: [
      "Voce e o especialista em requisitos. Compare o diff do PR com os criterios de aceite (AC) do Jira.",
      "Verifique: a logica implementada cobre todos os cenarios solicitados? Houve cobertura de fluxos de erro?",
      "Cite o trecho exato do codigo que atende (ou falha em atender) a cada criterio do card."
    ].join("\n"),

    project_consistency: [
      "Voce e o guardiao da arquitetura. Avalie se o PR respeita o estilo, padroes de pastas, injecao de dependencias e arquitetura do CPJ-Cobranca.",
      "Compare o diff com a estrutura de pastas e contratos existentes no projeto.",
      "Evite duplicacao de logica se ela ja existir num modulo compartilhado (shared/)."
    ].join("\n"),

    security: [
      "Voce e um especialista em seguranca AppSec. Analise vulnerabilidades como SQL Injection, XSS, Path Traversal, ou exposicao de logs sensiveis (LGPD).",
      "Verifique se o dado de entrada (req.body/params) esta sanitizado antes de qualquer operacao.",
      "Se identificar segredo hardcoded ou log de CPF/Authorization, classifique como CRITICAL."
    ].join("\n"),

    aggregator: [
      "Voce e o Tech Lead. Consolide as analises em um relatorio JSON final acionavel.",
      "Defina o 'verdict' como 'approved' APENAS se nao houver nenhum achado crítico ou médio pendente.",
      "Use 'changes_requested' para qualquer falha de seguranca, regra de negocio ignorada ou divergencia arquitetural grave.",
      "Resuma as prioridades: o que deve ser corrigido ANTES do merge e o que pode ser uma sugestao técnica para o futuro."
    ].join("\n"),
  };
}
