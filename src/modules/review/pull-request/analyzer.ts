import {
  AgentTelemetryCollector,
  LangChainStructuredOutputRunner,
  OpenRouterChatFactory,
  OpenRouterGenerationStatsClient,
  type AgentExecutionTelemetrySource,
  type StructuredOutputRunner,
} from "@/modules/agent";
import { LegacyPromptRuntimeResolver, type PromptRuntimeResolver } from "@/modules/prompts";
import {
  pullRequestReviewFindingSchema,
  pullRequestReviewJiraStatusSchema,
  pullRequestReviewResponseSchema,
  pullRequestReviewSectionStatusSchema,
  type AppEnv,
  type PullRequestReviewResponse,
} from "@shared";
import { loadEnv } from "@shared";
import { z } from "zod";
import { buildPullRequestReviewPayload } from "./analysis-payload";
import type { PullRequestReviewAnalysisContext, PullRequestReviewAnalyzer } from "./models";

const sectionAnalysisSchema = z.object({
  status: pullRequestReviewSectionStatusSchema,
  findings: z.array(pullRequestReviewFindingSchema),
});

const jiraCriteriaAnalysisSchema = z.object({
  status: pullRequestReviewJiraStatusSchema.exclude(["skipped"]),
  criteria: z.array(z.object({
    description: z.string().trim().min(1),
    status: pullRequestReviewJiraStatusSchema.exclude(["skipped"]),
    evidence: z.string().trim().min(1),
  })),
});

export class LLMPullRequestReviewAnalyzer implements PullRequestReviewAnalyzer {
  constructor(
    private readonly runner: StructuredOutputRunner,
    private readonly promptResolver: PromptRuntimeResolver = new LegacyPromptRuntimeResolver(),
    private readonly telemetrySource?: AgentExecutionTelemetrySource,
  ) {}

  static createDefault(input: {
    env?: AppEnv;
    promptResolver?: PromptRuntimeResolver;
    requestedModel?: string;
  } = {}): LLMPullRequestReviewAnalyzer {
    const env = input.env ?? loadEnv();
    const requestedModel = input.requestedModel ?? env.OPENROUTER_DEFAULT_MODEL;
    const chatModel = new OpenRouterChatFactory(env).create(requestedModel);
    const telemetryCollector = new AgentTelemetryCollector();
    const runner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: requestedModel,
      telemetrySink: telemetryCollector,
    });

    return new LLMPullRequestReviewAnalyzer(
      runner,
      input.promptResolver ?? new LegacyPromptRuntimeResolver(),
      telemetryCollector,
    );
  }

  async execute(context: PullRequestReviewAnalysisContext): Promise<PullRequestReviewResponse> {
    const prompts = await this.promptResolver.resolvePullRequestReview(context.input.prompt_version);
    const basePayload = buildPullRequestReviewPayload(context);
    const codeStandard = await this.runner.run({
      schema: sectionAnalysisSchema,
      schemaName: "PullRequestCodeStandardOutput",
      messages: [
        { role: "system", content: prompts.code_standard },
        { role: "user", content: JSON.stringify(basePayload, null, 2) },
      ],
    });
    const projectConsistency = await this.runner.run({
      schema: sectionAnalysisSchema,
      schemaName: "PullRequestProjectConsistencyOutput",
      messages: [
        { role: "system", content: prompts.project_consistency },
        { role: "user", content: JSON.stringify(basePayload, null, 2) },
      ],
    });
    const security = await this.runner.run({
      schema: sectionAnalysisSchema,
      schemaName: "PullRequestSecurityOutput",
      messages: [
        { role: "system", content: prompts.security },
        { role: "user", content: JSON.stringify(basePayload, null, 2) },
      ],
    });
    const jiraCriteria = context.jira
      ? await this.runner.run({
          schema: jiraCriteriaAnalysisSchema,
          schemaName: "PullRequestJiraCriteriaOutput",
          messages: [
            { role: "system", content: prompts.jira_criteria },
            { role: "user", content: JSON.stringify(basePayload, null, 2) },
          ],
        })
      : { status: "skipped" as const, criteria: [] };

    return this.runner.run({
      schema: pullRequestReviewResponseSchema,
      schemaName: "PullRequestReviewAggregatorOutput",
      messages: [
        { role: "system", content: prompts.aggregator },
        {
          role: "user",
          content: JSON.stringify({
            ...basePayload,
            section_outputs: {
              code_standard: codeStandard,
              jira_criteria: jiraCriteria,
              project_consistency: projectConsistency,
              security,
            },
          }, null, 2),
        },
      ],
    });
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.telemetrySource;
  }
}
