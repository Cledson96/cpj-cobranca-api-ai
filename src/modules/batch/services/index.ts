import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import type {
  BatchItemFlowType,
  BatchRequest,
  BatchResponse,
  BatchResult,
  ComplianceRequest,
  ComplianceResponse,
  DocumentRequest,
  DocumentResponse,
  ReviewRequest,
  ReviewResponse,
  TestsRequest,
  TestsResponse,
} from "@shared";

type BatchRequestItem = BatchRequest["items"][number];
type FlowExecutionService<TInput, TOutput> = {
  execute(input: TInput): Promise<TOutput>;
};
type ReviewBatchService = FlowExecutionService<ReviewRequest, ReviewResponse>;
type ComplianceBatchService = FlowExecutionService<ComplianceRequest, ComplianceResponse>;
type DocumentBatchService = FlowExecutionService<DocumentRequest, DocumentResponse>;
type TestsBatchService = FlowExecutionService<TestsRequest, TestsResponse>;

export interface BatchService {
  execute(input: BatchRequest): Promise<BatchResponse>;
}

export type CreateBatchSummaryInput = {
  id: string;
  status: BatchResponse["status"];
  itemCount: number;
  successCount: number;
  failedCount: number;
  durationMs: number;
};

export interface BatchSummaryRepository {
  createSummary(input: CreateBatchSummaryInput): Promise<void>;
}

export type DefaultBatchServiceDependencies = {
  reviewService?: ReviewBatchService;
  complianceService?: ComplianceBatchService;
  documentService?: DocumentBatchService;
  testsService?: TestsBatchService;
  batchRepository?: BatchSummaryRepository;
};

export class DefaultBatchService implements BatchService {
  private readonly reviewService?: ReviewBatchService;
  private readonly complianceService?: ComplianceBatchService;
  private readonly documentService?: DocumentBatchService;
  private readonly testsService?: TestsBatchService;
  private readonly batchRepository?: BatchSummaryRepository;

  constructor(dependencies: DefaultBatchServiceDependencies = {}) {
    this.reviewService = dependencies.reviewService;
    this.complianceService = dependencies.complianceService;
    this.documentService = dependencies.documentService;
    this.testsService = dependencies.testsService;
    this.batchRepository = dependencies.batchRepository;
  }

  async execute(input: BatchRequest): Promise<BatchResponse> {
    const startedAt = dayjs().valueOf();
    const batchId = randomUUID();
    const continueOnError = input.continue_on_error ?? true;
    const results: BatchResult[] = [];

    for (const [index, item] of input.items.entries()) {
      const result = await this.executeItem(index, item);
      results.push(result);

      if (result.status === "failed" && !continueOnError) {
        break;
      }
    }

    const status = getBatchStatus(results);
    const successCount = results.filter((result) => result.status === "success").length;
    const failedCount = results.filter((result) => result.status === "failed").length;

    await this.batchRepository?.createSummary({
      id: batchId,
      status,
      itemCount: input.items.length,
      successCount,
      failedCount,
      durationMs: dayjs().valueOf() - startedAt,
    });

    return {
      batch_id: batchId,
      status,
      results,
    };
  }

  private async executeItem(index: number, item: BatchRequestItem): Promise<BatchResult> {
    try {
      const output = await this.executeFlowItem(item);

      return {
        index,
        flow_type: item.flow_type,
        execution_id: null,
        status: "success",
        cache_hit: null,
        output,
        error_message: null,
      };
    } catch (error) {
      return {
        index,
        flow_type: item.flow_type,
        execution_id: null,
        status: "failed",
        cache_hit: null,
        output: null,
        error_message: getErrorMessage(error),
      };
    }
  }

  private executeFlowItem(item: BatchRequestItem): Promise<unknown> {
    switch (item.flow_type) {
      case "review":
        return requireService(this.reviewService, "review").execute(item.payload);
      case "compliance":
        return requireService(this.complianceService, "compliance").execute(item.payload);
      case "document":
        return requireService(this.documentService, "document").execute(item.payload);
      case "tests":
        return requireService(this.testsService, "tests").execute(item.payload);
    }
  }
}

function requireService<T>(service: T | undefined, flowType: BatchItemFlowType): T {
  if (!service) {
    throw new Error(`Servico do fluxo ${flowType} nao configurado para batch.`);
  }

  return service;
}

function getBatchStatus(results: BatchResult[]): BatchResponse["status"] {
  const successCount = results.filter((result) => result.status === "success").length;
  const failedCount = results.filter((result) => result.status === "failed").length;

  if (failedCount === 0) {
    return "success";
  }

  if (successCount === 0) {
    return "failed";
  }

  return "partial";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no item do batch.";
}
