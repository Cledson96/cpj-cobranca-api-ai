import type {
  PromptBlock,
  PromptBlockKey,
  PromptFlowType,
  PromptVersionCreateRequest,
  PromptVersionDetail,
  PromptVersionListResponse,
  PromptVersionSummary,
} from "@shared";

export type PromptVersionIdentifier = {
  flow_type: PromptFlowType;
  version: number;
};

export type PromptVersionListInput = {
  flow_type: PromptFlowType;
};

export type PromptVersionRecord = {
  flow_type: PromptFlowType;
  version: number;
  name: string;
  is_active: boolean;
  blocks: PromptBlock[];
};

export type CreatePromptVersionInput = PromptVersionCreateRequest;

export type PromptCatalogBlockMap = Record<PromptBlockKey, string | undefined>;

export type ReviewRuntimePromptSet = {
  naming_clarity: string;
  error_handling: string;
  resource_leak: string;
  complexity: string;
  security: string;
  aggregator: string;
};

export type SimpleRuntimePromptSet = {
  agent: string;
};

export type PullRequestReviewRuntimePromptSet = {
  code_standard: string;
  jira_criteria: string;
  project_consistency: string;
  security: string;
  aggregator: string;
};

export function toPromptVersionSummary(record: PromptVersionRecord): PromptVersionSummary {
  return {
    flow_type: record.flow_type,
    version: record.version,
    name: record.name,
    is_active: record.is_active,
    block_keys: record.blocks.map((block) => block.block_key),
  };
}

export function toPromptVersionDetail(record: PromptVersionRecord): PromptVersionDetail {
  return {
    ...toPromptVersionSummary(record),
    blocks: record.blocks,
  };
}

export function toPromptVersionListResponse(records: PromptVersionRecord[]): PromptVersionListResponse {
  return {
    items: records.map(toPromptVersionSummary),
  };
}
