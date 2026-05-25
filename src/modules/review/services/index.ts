import { createPayloadHash, type ReviewRequest, type ReviewResponse } from "@shared";
import { ReviewEngine, type ReviewExecutionPersistence } from "../engines";
import type {
  CreatePendingReviewExecutionInput,
  FlowExecutionMetadata,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  RecordReviewExecutionStepInput,
  ReviewExecutionRecord,
} from "@/modules/executions/models";
import type { ModelRuntimeResolver } from "@/modules/models";
import type { PromptRuntimeResolver } from "@/modules/prompts";

export type StartedEventData = {
  execution_id: string;
  cache_hit: boolean;
};

export type StepEventData = {
  node_name: string;
  kind: string;
  status: string;
  duration_ms: number;
};

export type ResultEventData = {
  output: ReviewResponse;
};

export type ErrorEventData = {
  message: string;
};

export type DoneEventData = Record<string, never>;

export type StreamingEvent = "started" | "step" | "result" | "error" | "done";

export type StreamingEventListener = (
  event: StreamingEvent,
  data: StartedEventData | StepEventData | ResultEventData | ErrorEventData | DoneEventData
) => void;

export interface ReviewService {
  execute(input: ReviewRequest): Promise<ReviewResponse>;
  executeWithMetadata?(input: ReviewRequest): Promise<FlowExecutionMetadata<ReviewResponse>>;
  executeStream(input: ReviewRequest, onEvent: StreamingEventListener): Promise<ReviewResponse>;
}

export type DefaultReviewServiceDependencies = {
  reviewEngine?: ReviewEngine;
  executionPersistence?: ReviewExecutionPersistence;
  promptResolver?: PromptRuntimeResolver;
  modelResolver?: ModelRuntimeResolver;
};

export class DummyPersistence implements ReviewExecutionPersistence {
  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    void requestHash;
    return null;
  }

  async createCacheHit(input: {
    inputPayload: ReviewRequest;
    requestHash: string;
    sourceExecutionId: string;
    outputPayload: ReviewResponse;
    durationMs: number;
  }): Promise<ReviewExecutionRecord> {
    const record: ReviewExecutionRecord = {
      id: "dummy",
      createdAt: new Date(),
      flowType: "review",
      status: "success",
      inputPayload: input.inputPayload,
      outputPayload: input.outputPayload,
      durationMs: input.durationMs,
      requestHash: input.requestHash,
      cacheHit: true,
      sourceExecutionId: input.sourceExecutionId,
      errorMessage: null,
    };
    return record;
  }

  async createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord> {
    const record: ReviewExecutionRecord = {
      id: "dummy",
      createdAt: new Date(),
      flowType: "review",
      status: "pending",
      inputPayload: input.inputPayload,
      outputPayload: null,
      durationMs: 0,
      requestHash: input.requestHash,
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    return record;
  }

  async markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord> {
    const record: ReviewExecutionRecord = {
      id: input.id,
      createdAt: new Date(),
      flowType: "review",
      status: "success",
      inputPayload: undefined,
      outputPayload: input.outputPayload,
      durationMs: input.durationMs,
      requestHash: "",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    return record;
  }

  async markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord> {
    const record: ReviewExecutionRecord = {
      id: input.id,
      createdAt: new Date(),
      flowType: "review",
      status: "failed",
      inputPayload: undefined,
      outputPayload: null,
      durationMs: input.durationMs,
      requestHash: "",
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: input.errorMessage,
    };
    return record;
  }

  async recordStep(input: RecordReviewExecutionStepInput): Promise<void> {
    void input;
  }

  async recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void> {
    void input;
  }
}

export class StreamingReviewExecutionPersistence implements ReviewExecutionPersistence {
  constructor(
    private readonly delegate: ReviewExecutionPersistence,
    private readonly onEvent: StreamingEventListener
  ) {}

  async findSuccessByHash(requestHash: string): Promise<ReviewExecutionRecord | null> {
    return this.delegate.findSuccessByHash(requestHash);
  }

  async createCacheHit(input: {
    inputPayload: ReviewRequest;
    requestHash: string;
    sourceExecutionId: string;
    outputPayload: ReviewResponse;
    durationMs: number;
  }): Promise<ReviewExecutionRecord> {
    const record = await this.delegate.createCacheHit(input);
    const startedData: StartedEventData = { execution_id: record.id, cache_hit: true };
    this.onEvent("started", startedData);
    const resultData: ResultEventData = { output: input.outputPayload };
    this.onEvent("result", resultData);
    return record;
  }

  async createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord> {
    const record = await this.delegate.createPending(input);
    const startedData: StartedEventData = { execution_id: record.id, cache_hit: false };
    this.onEvent("started", startedData);
    return record;
  }

  async markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord> {
    const record = await this.delegate.markSuccess(input);
    const resultData: ResultEventData = { output: input.outputPayload };
    this.onEvent("result", resultData);
    return record;
  }

  async markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord> {
    const record = await this.delegate.markFailed(input);
    const errorData: ErrorEventData = { message: input.errorMessage };
    this.onEvent("error", errorData);
    return record;
  }

  async recordStep(input: RecordReviewExecutionStepInput): Promise<void> {
    await this.delegate.recordStep(input);
    const stepData: StepEventData = {
      node_name: input.nodeName,
      kind: input.kind,
      status: input.status,
      duration_ms: input.durationMs,
    };
    this.onEvent("step", stepData);
  }

  async recordTelemetry(input: RecordReviewExecutionTelemetryInput): Promise<void> {
    await this.delegate.recordTelemetry(input);
  }
}

export class DefaultReviewService implements ReviewService {
  private reviewEngine?: ReviewEngine;
  private readonly executionPersistence?: ReviewExecutionPersistence;
  private readonly promptResolver?: PromptRuntimeResolver;
  private readonly modelResolver?: ModelRuntimeResolver;

  constructor(dependencies: DefaultReviewServiceDependencies = {}) {
    this.reviewEngine = dependencies.reviewEngine;
    this.executionPersistence = dependencies.executionPersistence;
    this.promptResolver = dependencies.promptResolver;
    this.modelResolver = dependencies.modelResolver;
  }

  async execute(input: ReviewRequest): Promise<ReviewResponse> {
    const engine = await this.createEngine(input.model);
    return engine.execute(input);
  }

  async executeWithMetadata(input: ReviewRequest): Promise<FlowExecutionMetadata<ReviewResponse>> {
    const output = await this.execute(input);
    let execution: ReviewExecutionRecord | null = null;

    if (this.executionPersistence) {
      try {
        execution = await this.executionPersistence.findSuccessByHash(createPayloadHash(input));
      } catch {
        // Falhas na consulta de metadados nao devem transformar sucesso em erro.
      }
    }

    return {
      output,
      execution_id: execution?.id ?? null,
      cache_hit: execution?.cacheHit ?? null,
    };
  }

  async executeStream(input: ReviewRequest, onEvent: StreamingEventListener): Promise<ReviewResponse> {
    const basePersistence = this.executionPersistence ?? new DummyPersistence();
    const streamingPersistence = new StreamingReviewExecutionPersistence(basePersistence, onEvent);

    const currentEngine = this.reviewEngine;
    const engine = currentEngine
      ? new ReviewEngine(
          currentEngine.getGraph(),
          streamingPersistence,
          currentEngine.getTelemetrySource(),
          currentEngine.getWebhookNotifier(),
          currentEngine.getPromptResolver(),
        )
      : ReviewEngine.createDefault({
          persistence: streamingPersistence,
          promptResolver: this.promptResolver,
          requestedModel: await this.resolveModel(input.model),
        });

    return engine.execute(input);
  }

  private async createEngine(requestedModel?: string): Promise<ReviewEngine> {
    if (this.reviewEngine) {
      return this.reviewEngine;
    }

    return ReviewEngine.createDefault({
      persistence: this.executionPersistence,
      promptResolver: this.promptResolver,
      requestedModel: await this.resolveModel(requestedModel),
    });
  }

  private async resolveModel(requestedModel?: string): Promise<string | undefined> {
    if (!this.modelResolver) {
      return requestedModel;
    }

    return this.modelResolver.resolveRequestedModel(requestedModel);
  }
}
