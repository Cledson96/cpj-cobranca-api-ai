import { describe, expect, it } from "vitest";
import {
  type ReviewLanguageGraphContext,
  ReviewTypeScriptGraph,
  type ReviewStepRecorder,
} from "@/modules/review/graphs";
import { TypeScriptLanguageProfile } from "@/modules/review/language";
import type {
  AgentMessage,
  StructuredOutputRunner,
  StructuredOutputRunnerInput,
} from "@/modules/agent/llm";
import type { ReviewRequest } from "@shared";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";

const reviewInput: ReviewRequest = {
  code: "export async function main() { return 1; }",
  language: "typescript",
};

class FakeStructuredOutputRunner implements StructuredOutputRunner {
  readonly messages: AgentMessage[][] = [];

  async run<TOutput extends Record<string, unknown>>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    this.messages.push(input.messages);

    if (input.schemaName === "ReviewAggregatorOutput") {
      return input.schema.parse({
        overall_quality: "good",
        score: 9,
        issues: [],
        positives: ["Codigo pequeno."],
        summary: "Sem problemas relevantes.",
      });
    }

    return input.schema.parse({
      agent_name: input.schemaName,
      findings: [],
      positives: ["Nenhum problema encontrado."],
      summary: "Analise especialista concluida.",
    });
  }
}

class FakeStepRecorder implements ReviewStepRecorder {
  readonly steps: RecordReviewExecutionStepInput[] = [];

  async recordStep(input: RecordReviewExecutionStepInput): Promise<void> {
    this.steps.push(input);
  }
}

describe("ReviewLanguageGraph steps", () => {
  it("registra os passos principais do fluxo especializado", async () => {
    const runner = new FakeStructuredOutputRunner();
    const recorder = new FakeStepRecorder();
    const graph = new ReviewTypeScriptGraph(runner);
    const context: ReviewLanguageGraphContext = {
      executionId: "execution-1",
      stepRecorder: recorder,
      languageProfile: new TypeScriptLanguageProfile(),
    };

    await graph.invoke(reviewInput, context);

    expect(recorder.steps.map((step) => step.nodeName)).toEqual([
      "deterministic_tools",
      "naming_clarity_agent",
      "error_handling_agent",
      "resource_leak_agent",
      "complexity_agent",
      "security_agent",
      "review_aggregator_agent",
    ]);
    expect(recorder.steps.every((step) => step.executionId === "execution-1")).toBe(true);
    expect(recorder.steps.every((step) => step.status === "success")).toBe(true);
    expect(recorder.steps[0]?.kind).toBe("tool");
    expect(recorder.steps[1]?.kind).toBe("llm");
    expect(recorder.steps[6]?.kind).toBe("llm");
  });
});
