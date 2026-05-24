import { z } from "zod";
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

const userPayloadSchema = z.record(z.string(), z.unknown());

class FakeStructuredOutputRunner implements StructuredOutputRunner {
  readonly calls: Array<{
    schemaName: string;
    messages: AgentMessage[];
  }> = [];

  async run<TOutput extends Record<string, unknown>>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    this.calls.push({
      schemaName: input.schemaName,
      messages: input.messages,
    });

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

    const nodeNames = recorder.steps.map((step) => step.nodeName);

    expect(nodeNames[0]).toBe("deterministic_tools");
    expect(nodeNames.at(-1)).toBe("review_aggregator_agent");
    expect(nodeNames).toEqual(expect.arrayContaining([
      "deterministic_tools",
      "naming_clarity_agent",
      "error_handling_agent",
      "resource_leak_agent",
      "complexity_agent",
      "security_agent",
      "review_aggregator_agent",
    ]));
    expect(recorder.steps.every((step) => step.executionId === "execution-1")).toBe(true);
    expect(recorder.steps.every((step) => step.status === "success")).toBe(true);
    expect(recorder.steps[0]?.kind).toBe("tool");
    expect(recorder.steps.slice(1).every((step) => step.kind === "llm")).toBe(true);
  });

  it("mantem especialistas isolados e envia todas as saidas ao agregador", async () => {
    const runner = new FakeStructuredOutputRunner();
    const graph = new ReviewTypeScriptGraph(runner);
    const context: ReviewLanguageGraphContext = {
      languageProfile: new TypeScriptLanguageProfile(),
    };

    await graph.invoke(reviewInput, context);

    const specialistCalls = runner.calls.filter((call) => call.schemaName !== "ReviewAggregatorOutput");
    const aggregatorCall = runner.calls.find((call) => call.schemaName === "ReviewAggregatorOutput");

    expect(specialistCalls).toHaveLength(5);
    for (const call of specialistCalls) {
      expect(readUserPayload(call.messages).saidas_agentes_anteriores).toEqual([]);
    }
    expect(aggregatorCall).toBeDefined();
    expect(readUserPayload(aggregatorCall?.messages ?? []).saidas_especialistas).toHaveLength(5);
  });
});

function readUserPayload(messages: AgentMessage[]): Record<string, unknown> {
  const message = messages.find((item) => item.role === "user");
  if (!message) {
    return {};
  }

  const parsed: unknown = JSON.parse(message.content);
  const result = userPayloadSchema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  return {};
}
