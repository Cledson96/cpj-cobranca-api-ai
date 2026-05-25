import type { ReviewRequest, ReviewResponse } from "@shared";
import { ReviewEngine, type ReviewExecutionPersistence } from "../engines";
import type {
  CreatePendingReviewExecutionInput,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  RecordReviewExecutionTelemetryInput,
  RecordReviewExecutionStepInput,
  ReviewExecutionRecord,
} from "@/modules/executions/models";

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
  executeStream(input: ReviewRequest, onEvent: StreamingEventListener): Promise<ReviewResponse>;
}

export type DefaultReviewServiceDependencies = {
  reviewEngine?: ReviewEngine;
  executionPersistence?: ReviewExecutionPersistence;
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
    const doneData: DoneEventData = {};
    this.onEvent("done", doneData);
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
    const doneData: DoneEventData = {};
    this.onEvent("done", doneData);
    return record;
  }

  async markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord> {
    const record = await this.delegate.markFailed(input);
    const errorData: ErrorEventData = { message: input.errorMessage };
    this.onEvent("error", errorData);
    const doneData: DoneEventData = {};
    this.onEvent("done", doneData);
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

  constructor(dependencies: DefaultReviewServiceDependencies = {}) {
    this.reviewEngine = dependencies.reviewEngine;
    this.executionPersistence = dependencies.executionPersistence;
  }

  async execute(input: ReviewRequest): Promise<ReviewResponse> {
    const engine = this.reviewEngine ?? ReviewEngine.createDefault({
      persistence: this.executionPersistence,
    });
    return engine.execute(input);
  }

  async executeStream(input: ReviewRequest, onEvent: StreamingEventListener): Promise<ReviewResponse> {
    const basePersistence = this.executionPersistence ?? new DummyPersistence();
    const streamingPersistence = new StreamingReviewExecutionPersistence(basePersistence, onEvent);

    const currentEngine = this.reviewEngine;
    const engine = currentEngine
      ? new ReviewEngine(
          currentEngine.getGraph(),
          streamingPersistence,
          currentEngine.getTelemetrySource()
        )
      : ReviewEngine.createDefault({
          persistence: streamingPersistence,
        });

    return engine.execute(input);
  }
}
