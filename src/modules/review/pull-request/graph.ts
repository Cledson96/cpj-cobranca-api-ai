import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import dayjs from "dayjs";
import {
  AgentTelemetryCollector,
  LangChainStructuredOutputRunner,
  OpenRouterChatFactory,
  OpenRouterGenerationStatsClient,
  type AgentExecutionTelemetrySource,
  type StructuredOutputRunner,
} from "@/modules/agent";
import type { PullRequestReviewRuntimePromptSet } from "@/modules/prompts";
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import {
  loadEnv,
  pullRequestReviewFindingSchema,
  pullRequestReviewJiraStatusSchema,
  pullRequestReviewResponseSchema,
  pullRequestReviewSectionStatusSchema,
  pullRequestReviewVerdictSchema,
  type AppEnv,
  type PullRequestReviewRequest,
  type PullRequestReviewResponse,
} from "@shared";
import { z } from "zod";
import { buildPullRequestReviewPayload } from "./analysis-payload";
import { FileSystemCodeStandardsLoader } from "./code-standards.loader";
import { HttpGitHubPullRequestClient } from "./github.client";
import { HttpJiraIssueClient } from "./jira.client";
import type {
  CodeStandardDocument,
  CodeStandardsLoader,
  GitHubPullRequestClient,
  GitHubPullRequestSource,
  JiraIssueClient,
  JiraIssueSource,
} from "./models";

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

const aggregatorDecisionSchema = z.object({
  verdict: pullRequestReviewVerdictSchema,
  score: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  positives: z.array(z.string().trim().min(1)),
  recommendations: z.array(z.string().trim().min(1)),
});

type SectionAnalysisOutput = z.infer<typeof sectionAnalysisSchema>;
type JiraCriteriaOutput = z.infer<typeof jiraCriteriaAnalysisSchema> | {
  status: "skipped";
  criteria: [];
};
type AggregatorDecisionOutput = z.infer<typeof aggregatorDecisionSchema>;
type PullRequestReviewAnalysisPayload = ReturnType<typeof buildPullRequestReviewPayload>;

export type PullRequestReviewStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type PullRequestReviewGraphRunContext = {
  executionId?: string;
  stepRecorder?: PullRequestReviewStepRecorder;
  promptSet: PullRequestReviewRuntimePromptSet;
  resolvedModel?: string;
};

export interface PullRequestReviewGraphRunner {
  invoke(input: PullRequestReviewRequest, context: PullRequestReviewGraphRunContext): Promise<PullRequestReviewResponse>;
  getTelemetrySource?(): AgentExecutionTelemetrySource | undefined;
}

export type PullRequestReviewFlowGraphDependencies = {
  githubClient?: GitHubPullRequestClient;
  jiraClient?: JiraIssueClient;
  standardsLoader?: CodeStandardsLoader;
  runner: StructuredOutputRunner;
  telemetrySource?: AgentExecutionTelemetrySource;
};

const PullRequestReviewAnnotation = Annotation.Root({
  input: Annotation<PullRequestReviewRequest>,
  executionId: Annotation<string | undefined>,
  promptSet: Annotation<PullRequestReviewRuntimePromptSet>,
  resolvedModel: Annotation<string | undefined>,
  source: Annotation<GitHubPullRequestSource | undefined>,
  jira: Annotation<JiraIssueSource | null | undefined>,
  standards: Annotation<CodeStandardDocument[]>({
    reducer: (_left: CodeStandardDocument[], right: CodeStandardDocument[]) => right,
    default: () => [],
  }),
  analysisPayload: Annotation<PullRequestReviewAnalysisPayload | undefined>,
  codeStandard: Annotation<SectionAnalysisOutput | undefined>,
  projectConsistency: Annotation<SectionAnalysisOutput | undefined>,
  security: Annotation<SectionAnalysisOutput | undefined>,
  jiraCriteria: Annotation<JiraCriteriaOutput | undefined>,
  output: Annotation<PullRequestReviewResponse | undefined>,
});

type PullRequestReviewGraphState = typeof PullRequestReviewAnnotation.State;

export class PullRequestReviewFlowGraph implements PullRequestReviewGraphRunner {
  private readonly githubClient: GitHubPullRequestClient;
  private readonly jiraClient: JiraIssueClient;
  private readonly standardsLoader: CodeStandardsLoader;
  private readonly runner: StructuredOutputRunner;
  private readonly compiledGraph: ReturnType<PullRequestReviewFlowGraph["buildGraph"]>;

  constructor(private readonly dependencies: PullRequestReviewFlowGraphDependencies) {
    this.githubClient = dependencies.githubClient ?? new HttpGitHubPullRequestClient();
    this.jiraClient = dependencies.jiraClient ?? new HttpJiraIssueClient();
    this.standardsLoader = dependencies.standardsLoader ?? new FileSystemCodeStandardsLoader();
    this.runner = dependencies.runner;
    this.compiledGraph = this.buildGraph();
  }

  static createDefault(input: {
    env?: AppEnv;
    requestedModel?: string;
    githubClient?: GitHubPullRequestClient;
    jiraClient?: JiraIssueClient;
    standardsLoader?: CodeStandardsLoader;
  } = {}): PullRequestReviewFlowGraph {
    const env = input.env ?? loadEnv();
    const requestedModel = input.requestedModel ?? env.OPENROUTER_DEFAULT_MODEL;
    const chatModel = new OpenRouterChatFactory(env).create(requestedModel);
    const telemetryCollector = new AgentTelemetryCollector();
    const runner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: requestedModel,
      telemetrySink: telemetryCollector,
    });

    return new PullRequestReviewFlowGraph({
      githubClient: input.githubClient,
      jiraClient: input.jiraClient,
      standardsLoader: input.standardsLoader,
      runner,
      telemetrySource: telemetryCollector,
    });
  }

  async invoke(
    input: PullRequestReviewRequest,
    context: PullRequestReviewGraphRunContext,
  ): Promise<PullRequestReviewResponse> {
    const state = await this.compiledGraph.invoke(
      {
        input,
        executionId: context.executionId,
        promptSet: context.promptSet,
        resolvedModel: context.resolvedModel,
      },
      {
        configurable: {
          stepRecorder: context.stepRecorder,
        },
      },
    );

    if (!state.output) {
      throw new GenericError("Fluxo de review de pull request nao gerou resposta final.");
    }

    return state.output;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.dependencies.telemetrySource;
  }

  private buildGraph() {
    return new StateGraph(PullRequestReviewAnnotation)
      .addNode("github_fetch", (state, config) => this.runGitHubFetch(state, config))
      .addNode("jira_fetch", (state, config) => this.runJiraFetch(state, config))
      .addNode("standards_load", (state, config) => this.runStandardsLoad(state, config))
      .addNode("analysis_payload_prepare", (state, config) => this.runAnalysisPayloadPrepare(state, config))
      .addNode("code_standard_agent", (state, config) => this.runCodeStandardAgent(state, config))
      .addNode("project_consistency_agent", (state, config) => this.runProjectConsistencyAgent(state, config))
      .addNode("security_agent", (state, config) => this.runSecurityAgent(state, config))
      .addNode("jira_criteria_agent", (state, config) => this.runJiraCriteriaAgent(state, config))
      .addNode("pull_request_review_aggregator", (state, config) => this.runAggregator(state, config))
      .addEdge(START, "github_fetch")
      .addEdge("github_fetch", "jira_fetch")
      .addEdge("github_fetch", "standards_load")
      .addEdge(["jira_fetch", "standards_load"], "analysis_payload_prepare")
      .addEdge("analysis_payload_prepare", "code_standard_agent")
      .addEdge("analysis_payload_prepare", "project_consistency_agent")
      .addEdge("analysis_payload_prepare", "security_agent")
      .addEdge("analysis_payload_prepare", "jira_criteria_agent")
      .addEdge([
        "code_standard_agent",
        "project_consistency_agent",
        "security_agent",
        "jira_criteria_agent",
      ], "pull_request_review_aggregator")
      .addEdge("pull_request_review_aggregator", END)
      .compile();
  }

  private readonly runGitHubFetch = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "github_fetch",
    kind: "tool",
    inputPayload: {
      github_pull_request_url: state.input.github_pull_request_url,
      base_branch: state.input.base_branch,
    },
    outputPayload: (source) => ({
      pullRequest: (source as GitHubPullRequestSource).pullRequest,
      changedFiles: (source as GitHubPullRequestSource).files.length,
      contextFiles: (source as GitHubPullRequestSource).contextFiles.length,
    }),
    operation: async () => ({
      source: await this.githubClient.fetchPullRequest(state.input),
    }),
  });

  private readonly runJiraFetch = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "jira_fetch",
    kind: state.input.jira_issue_key ? "tool" : "system",
    inputPayload: {
      jira_issue_key: state.input.jira_issue_key ?? null,
    },
    outputPayload: (jira) => jira ? {
      issue_key: (jira as JiraIssueSource).issue_key,
      summary: (jira as JiraIssueSource).summary,
      criteria_count: (jira as JiraIssueSource).acceptance_criteria.length,
    } : { skipped: true },
    operation: async () => ({
      jira: state.input.jira_issue_key
        ? await this.jiraClient.fetchIssue(state.input.jira_issue_key)
        : null,
    }),
  });

  private readonly runStandardsLoad = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "standards_load",
    kind: "tool",
    inputPayload: {
      files: this.requireSource(state).files.map((file) => file.filename),
    },
    outputPayload: (standards) => ({
      technologies: (standards as CodeStandardDocument[]).map((standard) => standard.technology),
    }),
    operation: async () => ({
      standards: await this.standardsLoader.loadForFiles(
        this.requireSource(state).files.map((file) => file.filename),
      ),
    }),
  });

  private readonly runAnalysisPayloadPrepare = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "analysis_payload_prepare",
    kind: "system",
    inputPayload: {
      changedFiles: this.requireSource(state).files.length,
      contextFiles: this.requireSource(state).contextFiles.length,
      standards: state.standards.map((standard) => standard.technology),
      hasJira: Boolean(state.jira),
    },
    outputPayload: (analysisPayload) => ({
      truncation: (analysisPayload as PullRequestReviewAnalysisPayload).truncation,
    }),
    operation: async () => ({
      analysisPayload: buildPullRequestReviewPayload({
        input: state.input,
        source: this.requireSource(state),
        jira: state.jira ?? null,
        standards: state.standards,
        resolvedModel: state.resolvedModel,
      }),
    }),
  });

  private readonly runCodeStandardAgent = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runSectionAgent(state, config, {
    nodeName: "code_standard_agent",
    schemaName: "PullRequestCodeStandardOutput",
    systemPrompt: state.promptSet.code_standard,
  });

  private readonly runProjectConsistencyAgent = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runSectionAgent(state, config, {
    nodeName: "project_consistency_agent",
    schemaName: "PullRequestProjectConsistencyOutput",
    systemPrompt: state.promptSet.project_consistency,
  });

  private readonly runSecurityAgent = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runSectionAgent(state, config, {
    nodeName: "security_agent",
    schemaName: "PullRequestSecurityOutput",
    systemPrompt: state.promptSet.security,
  });

  private readonly runJiraCriteriaAgent = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => {
    if (!state.jira) {
      await this.recordStep(state, config, {
        nodeName: "jira_criteria_agent",
        kind: "system",
        inputPayload: { skipped: true },
        outputPayload: { status: "skipped", criteria: [] },
        startedAt: dayjs().valueOf(),
      });

      return {
        jiraCriteria: { status: "skipped" as const, criteria: [] },
      };
    }

    return this.runRecordedOperation(state, config, {
      nodeName: "jira_criteria_agent",
      kind: "llm",
      inputPayload: this.createAgentInputPayload(state),
      outputPayload: (jiraCriteria) => jiraCriteria,
      operation: async () => ({
        jiraCriteria: await this.runner.run({
          schema: jiraCriteriaAnalysisSchema,
          schemaName: "PullRequestJiraCriteriaOutput",
          messages: [
            { role: "system", content: state.promptSet.jira_criteria },
            { role: "user", content: JSON.stringify(this.requireAnalysisPayload(state), null, 2) },
          ],
        }),
      }),
    });
  };

  private readonly runAggregator = async (
    state: PullRequestReviewGraphState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "pull_request_review_aggregator",
    kind: "llm",
    inputPayload: {
      ...this.createAgentInputPayload(state),
      section_outputs: this.requireSectionOutputs(state),
    },
    outputPayload: (output) => output,
    operation: async () => ({
      output: this.buildFinalResponse(
        state,
        await this.runner.run({
        schema: aggregatorDecisionSchema,
        schemaName: "PullRequestReviewAggregatorOutput",
        messages: [
          { role: "system", content: createAggregatorSystemPrompt(state.promptSet.aggregator) },
          {
            role: "user",
            content: JSON.stringify({
              ...this.requireAnalysisPayload(state),
              section_outputs: this.requireSectionOutputs(state),
            }, null, 2),
          },
        ],
        }),
      ),
    }),
  });

  private runSectionAgent(
    state: PullRequestReviewGraphState,
    config: RunnableConfig | undefined,
    input: {
      nodeName: "code_standard_agent" | "project_consistency_agent" | "security_agent";
      schemaName: string;
      systemPrompt: string;
    },
  ) {
    return this.runRecordedOperation(state, config, {
      nodeName: input.nodeName,
      kind: "llm",
      inputPayload: this.createAgentInputPayload(state),
      outputPayload: (output) => output,
      operation: async () => ({
        [sectionStateKey(input.nodeName)]: await this.runner.run({
          schema: sectionAnalysisSchema,
          schemaName: input.schemaName,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: JSON.stringify(this.requireAnalysisPayload(state), null, 2) },
          ],
        }),
      }),
    });
  }

  private async runRecordedOperation<TStateUpdate extends Record<string, unknown>, TOutput>(
    state: PullRequestReviewGraphState,
    config: RunnableConfig | undefined,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      operation: () => Promise<TStateUpdate>;
      outputPayload?: (output: TOutput) => unknown;
    },
  ): Promise<TStateUpdate> {
    const startedAt = dayjs().valueOf();

    try {
      const update = await input.operation();
      const output = Object.values(update)[0] as TOutput;
      await this.recordStep(state, config, {
        nodeName: input.nodeName,
        kind: input.kind,
        inputPayload: input.inputPayload,
        outputPayload: input.outputPayload ? input.outputPayload(output) : output,
        startedAt,
      });

      return update;
    } catch (error) {
      await this.recordStep(state, config, {
        nodeName: input.nodeName,
        kind: input.kind,
        inputPayload: input.inputPayload,
        startedAt,
        error,
      });
      throw handleUnknownError(error);
    }
  }

  private async recordStep(
    state: PullRequestReviewGraphState,
    config: RunnableConfig | undefined,
    input: {
      nodeName: string;
      kind: RecordReviewExecutionStepInput["kind"];
      inputPayload?: unknown;
      outputPayload?: unknown;
      startedAt: number;
      error?: unknown;
    },
  ): Promise<void> {
    const stepRecorder = config?.configurable?.stepRecorder as PullRequestReviewStepRecorder | undefined;
    if (!state.executionId || !stepRecorder) {
      return;
    }

    const errorMessage = getErrorMessage(input.error);

    await stepRecorder.recordStep({
      executionId: state.executionId,
      nodeName: input.nodeName,
      kind: input.kind,
      status: errorMessage ? "failed" : "success",
      inputPayload: input.inputPayload,
      outputPayload: input.outputPayload,
      durationMs: dayjs().valueOf() - input.startedAt,
      errorMessage,
    });
  }

  private requireSource(state: PullRequestReviewGraphState): GitHubPullRequestSource {
    if (!state.source) {
      throw new GenericError("Dados do GitHub ausentes no fluxo de pull request.");
    }

    return state.source;
  }

  private requireAnalysisPayload(state: PullRequestReviewGraphState): PullRequestReviewAnalysisPayload {
    if (!state.analysisPayload) {
      throw new GenericError("Payload de analise ausente no fluxo de pull request.");
    }

    return state.analysisPayload;
  }

  private requireSectionOutputs(state: PullRequestReviewGraphState) {
    if (!state.codeStandard || !state.projectConsistency || !state.security || !state.jiraCriteria) {
      throw new GenericError("Resultados parciais ausentes no fluxo de pull request.");
    }

    return {
      code_standard: state.codeStandard,
      jira_criteria: state.jiraCriteria,
      project_consistency: state.projectConsistency,
      security: state.security,
    };
  }

  private buildFinalResponse(
    state: PullRequestReviewGraphState,
    decision: AggregatorDecisionOutput,
  ): PullRequestReviewResponse {
    const source = this.requireSource(state);
    const sections = this.requireSectionOutputs(state);
    const output: PullRequestReviewResponse = {
      verdict: decision.verdict,
      score: decision.score,
      summary: decision.summary,
      pull_request: {
        owner: source.pullRequest.owner,
        repo: source.pullRequest.repo,
        number: source.pullRequest.number,
        title: source.pullRequest.title,
        base_branch: source.pullRequest.baseBranch,
        head_sha: source.pullRequest.headSha,
        changed_files: source.pullRequest.changedFiles,
      },
      jira: state.jira
        ? {
            issue_key: state.jira.issue_key,
            summary: state.jira.summary,
            criteria_count: state.jira.acceptance_criteria.length,
            evaluated: true,
          }
        : null,
      sections,
      positives: decision.positives,
      recommendations: decision.recommendations,
    };

    return pullRequestReviewResponseSchema.parse(output);
  }

  private createAgentInputPayload(state: PullRequestReviewGraphState) {
    const analysisPayload = this.requireAnalysisPayload(state);

    return {
      pull_request: analysisPayload.pull_request,
      truncation: analysisPayload.truncation,
      changed_files_count: analysisPayload.changed_files.length,
      context_files_count: analysisPayload.project_context_files.length,
      standards: analysisPayload.code_standards.map((standard) => standard.technology),
      has_jira: Boolean(analysisPayload.jira),
    };
  }
}

function createAggregatorSystemPrompt(basePrompt: string): string {
  return [
    basePrompt,
    "",
    "Retorne somente a decisao consolidada, sem reconstruir metadados do PR, Jira ou secoes.",
    "O JSON deve conter exatamente: verdict, score, summary, positives e recommendations.",
    "Use verdict approved apenas quando as secoes nao trouxerem achados relevantes.",
    "Use changes_requested quando houver falha de seguranca, criterio de Jira nao atendido ou problema bloqueante.",
    "Use needs_attention quando houver alertas importantes, mas nao bloqueantes.",
  ].join("\n");
}

function sectionStateKey(nodeName: "code_standard_agent" | "project_consistency_agent" | "security_agent") {
  return {
    code_standard_agent: "codeStandard",
    project_consistency_agent: "projectConsistency",
    security_agent: "security",
  }[nodeName];
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no passo do review de pull request.";
}
