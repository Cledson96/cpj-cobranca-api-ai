import {
  BaseAgentEngine,
  LangChainStructuredOutputRunner,
  OpenRouterChatFactory,
} from "@/modules/agent";
import dayjs from "dayjs";
import { handleUnknownError } from "@/infrastructure/errors";
import type {
  CreatePendingReviewExecutionInput,
  MarkReviewExecutionFailedInput,
  MarkReviewExecutionSuccessInput,
  ReviewExecutionRecord,
} from "@/modules/executions";
import type { AppEnv, ReviewRequest, ReviewResponse } from "@shared";
import { createPayloadHash, loadEnv } from "@shared";
import { LanguageRouter } from "../language";
import {
  ReviewFlowGraph,
  ReviewJavaScriptGraph,
  ReviewPhpGraph,
  ReviewPythonGraph,
  ReviewTypeScriptGraph,
  type ReviewGraphRunner,
  type ReviewStepRecorder,
} from "../graphs";

export interface ReviewExecutionPersistence extends ReviewStepRecorder {
  createPending(input: CreatePendingReviewExecutionInput): Promise<ReviewExecutionRecord>;
  markSuccess(input: MarkReviewExecutionSuccessInput): Promise<ReviewExecutionRecord>;
  markFailed(input: MarkReviewExecutionFailedInput): Promise<ReviewExecutionRecord>;
}

export class ReviewEngine extends BaseAgentEngine<ReviewRequest, ReviewResponse> {
  constructor(
    private readonly graph: ReviewGraphRunner,
    private readonly persistence?: ReviewExecutionPersistence,
  ) {
    super("review");
  }

  static createDefault(input: {
    env?: AppEnv;
    persistence?: ReviewExecutionPersistence;
  } = {}): ReviewEngine {
    const env = input.env ?? loadEnv();
    const chatModel = new OpenRouterChatFactory(env).create();
    const structuredOutputRunner = new LangChainStructuredOutputRunner(chatModel);

    return new ReviewEngine(
      new ReviewFlowGraph({
        languageRouter: new LanguageRouter(),
        languageGraphs: {
          typescript: new ReviewTypeScriptGraph(structuredOutputRunner),
          javascript: new ReviewJavaScriptGraph(structuredOutputRunner),
          python: new ReviewPythonGraph(structuredOutputRunner),
          php: new ReviewPhpGraph(structuredOutputRunner),
        },
      }),
      input.persistence,
    );
  }

  protected async invoke(input: ReviewRequest): Promise<ReviewResponse> {
    if (!this.persistence) {
      return this.graph.invoke(input);
    }

    const startedAt = dayjs().valueOf();
    const execution = await this.persistence.createPending({
      inputPayload: input,
      requestHash: createPayloadHash(input),
    });

    try {
      const output = await this.graph.invoke(input, {
        executionId: execution.id,
        stepRecorder: this.persistence,
      });
      await this.persistence.markSuccess({
        id: execution.id,
        outputPayload: output,
        durationMs: dayjs().valueOf() - startedAt,
      });

      return output;
    } catch (error) {
      const handledError = handleUnknownError(error);
      await this.persistence.markFailed({
        id: execution.id,
        errorMessage: handledError.message,
        durationMs: dayjs().valueOf() - startedAt,
      });
      throw handledError;
    }
  }
}
