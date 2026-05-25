import { describe, expect, it, vi } from "vitest";
import { ReviewEngine, type ReviewExecutionPersistence } from "@/modules/review/engines";
import { DefaultReviewService } from "@/modules/review/services";
import type { ReviewExecutionRecord } from "@/modules/executions";
import { createPayloadHash, type ReviewRequest, type ReviewResponse } from "@shared";

const reviewInput: ReviewRequest = {
  code: "export function sum(a: number, b: number) { return a + b; }",
  language: "typescript",
};

const reviewOutput: ReviewResponse = {
  overall_quality: "good",
  score: 9,
  issues: [],
  positives: ["Funcao pequena."],
  summary: "Sem problemas relevantes.",
};

describe("DefaultReviewService", () => {
  it("retorna metadados da execucao persistida", async () => {
    const reviewEngine = {
      execute: vi.fn().mockResolvedValue(reviewOutput),
    } as unknown as ReviewEngine;
    const executionRecord: ReviewExecutionRecord = {
      id: "execution-review-1",
      createdAt: new Date("2026-05-25T10:00:00.000Z"),
      flowType: "review",
      status: "success",
      inputPayload: reviewInput,
      outputPayload: reviewOutput,
      durationMs: 12,
      requestHash: createPayloadHash(reviewInput),
      cacheHit: false,
      sourceExecutionId: null,
      errorMessage: null,
    };
    const findSuccessByHash = vi.fn().mockResolvedValue(executionRecord);
    const executionPersistence = {
      findSuccessByHash,
    } as unknown as ReviewExecutionPersistence;
    const service = new DefaultReviewService({ reviewEngine, executionPersistence });

    const output = await service.executeWithMetadata(reviewInput);

    expect(output).toEqual({
      output: reviewOutput,
      execution_id: "execution-review-1",
      cache_hit: false,
    });
    expect(reviewEngine.execute).toHaveBeenCalledWith(reviewInput);
    expect(findSuccessByHash).toHaveBeenCalledWith(createPayloadHash(reviewInput));
  });
});
