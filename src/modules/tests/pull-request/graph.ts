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
import type { RecordReviewExecutionStepInput } from "@/modules/executions";
import {
  HttpGitHubPullRequestClient,
  type GitHubPullRequestClient,
  type GitHubPullRequestFile,
  type GitHubPullRequestSource,
} from "@/modules/review/pull-request";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import {
  loadEnv,
  testsResponseSchema,
  type AppEnv,
  type PullRequestTestsRequest,
  type SupportedLanguage,
  type TestsResponse,
} from "@shared";
import type { TestsPromptCatalog } from "@/modules/tests/prompts";

const MAX_PAYLOAD_CHARS = 90_000;
const MAX_DIFF_CHARS = 18_000;
const MAX_CHANGED_FILES = 25;
const MAX_PATCH_CHARS = 1_400;
const MAX_CONTEXT_FILES = 10;
const MAX_CONTEXT_CHARS = 1_800;
const MAX_CRITICAL_FUNCTIONS = 24;

export type CriticalFunctionCandidate = {
  name: string;
  kind: "function" | "class" | "method" | "branch" | "error_case" | "side_effect" | "changed_file";
  file_path: string;
  line_hint: string | null;
  reason: string;
  snippet: string | null;
};

export type PullRequestTestsStepRecorder = {
  recordStep(input: RecordReviewExecutionStepInput): Promise<void>;
};

export type PullRequestTestsGraphRunContext = {
  executionId?: string;
  stepRecorder?: PullRequestTestsStepRecorder;
  promptCatalog: TestsPromptCatalog;
  resolvedModel?: string;
};

export interface PullRequestTestsGraphRunner {
  invoke(input: PullRequestTestsRequest, context: PullRequestTestsGraphRunContext): Promise<TestsResponse>;
  getTelemetrySource?(): AgentExecutionTelemetrySource | undefined;
}

export type PullRequestTestsFlowGraphDependencies = {
  githubClient?: GitHubPullRequestClient;
  runner: StructuredOutputRunner;
  telemetrySource?: AgentExecutionTelemetrySource;
};

type PreparedPullRequestTestsPayload = {
  request: PullRequestTestsRequest;
  language: SupportedLanguage;
  pull_request: GitHubPullRequestSource["pullRequest"];
  diff: string;
  changed_files: Array<{
    filename: string;
    status: string;
    patch: string | null;
  }>;
  project_context_files: Array<{
    path: string;
    content: string;
  }>;
  critical_functions: CriticalFunctionCandidate[];
  truncation: {
    truncated: boolean;
    notes: string[];
  };
};

const PullRequestTestsAnnotation = Annotation.Root({
  input: Annotation<PullRequestTestsRequest>,
  executionId: Annotation<string | undefined>,
  promptCatalog: Annotation<TestsPromptCatalog>,
  resolvedModel: Annotation<string | undefined>,
  source: Annotation<GitHubPullRequestSource | undefined>,
  language: Annotation<SupportedLanguage | undefined>,
  preparedPayload: Annotation<Omit<PreparedPullRequestTestsPayload, "critical_functions"> | undefined>,
  criticalFunctions: Annotation<CriticalFunctionCandidate[]>({
    reducer: (_left: CriticalFunctionCandidate[], right: CriticalFunctionCandidate[]) => right,
    default: () => [],
  }),
  output: Annotation<TestsResponse | undefined>,
});

type PullRequestTestsState = typeof PullRequestTestsAnnotation.State;

export class PullRequestTestsFlowGraph implements PullRequestTestsGraphRunner {
  private readonly githubClient: GitHubPullRequestClient;
  private readonly runner: StructuredOutputRunner;
  private readonly compiledGraph: ReturnType<PullRequestTestsFlowGraph["buildGraph"]>;

  constructor(private readonly dependencies: PullRequestTestsFlowGraphDependencies) {
    this.githubClient = dependencies.githubClient ?? new HttpGitHubPullRequestClient();
    this.runner = dependencies.runner;
    this.compiledGraph = this.buildGraph();
  }

  static createDefault(input: {
    env?: AppEnv;
    requestedModel?: string;
    githubClient?: GitHubPullRequestClient;
  } = {}): PullRequestTestsFlowGraph {
    const env = input.env ?? loadEnv();
    const requestedModel = input.requestedModel ?? env.OPENROUTER_DEFAULT_MODEL;
    const chatModel = new OpenRouterChatFactory(env).create(requestedModel);
    const telemetryCollector = new AgentTelemetryCollector();
    const runner = new LangChainStructuredOutputRunner(chatModel, {
      generationStatsClient: OpenRouterGenerationStatsClient.createFromEnv(env),
      modelRequested: requestedModel,
      retryAttempts: env.EXTERNAL_RETRY_ATTEMPTS,
      retryBaseDelayMs: env.EXTERNAL_RETRY_BASE_DELAY_MS,
      telemetrySink: telemetryCollector,
    });

    return new PullRequestTestsFlowGraph({
      githubClient: input.githubClient,
      runner,
      telemetrySource: telemetryCollector,
    });
  }

  async invoke(
    input: PullRequestTestsRequest,
    context: PullRequestTestsGraphRunContext,
  ): Promise<TestsResponse> {
    const state = await this.compiledGraph.invoke(
      {
        input,
        executionId: context.executionId,
        promptCatalog: context.promptCatalog,
        resolvedModel: context.resolvedModel,
      },
      {
        configurable: {
          stepRecorder: context.stepRecorder,
        },
      },
    );

    if (!state.output) {
      throw new GenericError("Fluxo de testes por pull request nao gerou resposta final.");
    }

    return state.output;
  }

  getTelemetrySource(): AgentExecutionTelemetrySource | undefined {
    return this.dependencies.telemetrySource;
  }

  private buildGraph() {
    return new StateGraph(PullRequestTestsAnnotation)
      .addNode("github_fetch", (state, config) => this.runGitHubFetch(state, config))
      .addNode("changed_code_prepare", (state, config) => this.runChangedCodePrepare(state, config))
      .addNode("critical_functions_extractor", (state, config) => this.runCriticalFunctionsExtractor(state, config))
      .addNode("tests_agent", (state, config) => this.runTestsAgent(state, config))
      .addEdge(START, "github_fetch")
      .addEdge("github_fetch", "changed_code_prepare")
      .addEdge("changed_code_prepare", "critical_functions_extractor")
      .addEdge("critical_functions_extractor", "tests_agent")
      .addEdge("tests_agent", END)
      .compile();
  }

  private readonly runGitHubFetch = async (
    state: PullRequestTestsState,
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

  private readonly runChangedCodePrepare = async (
    state: PullRequestTestsState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "changed_code_prepare",
    kind: "system",
    inputPayload: {
      changedFiles: this.requireSource(state).files.map((file) => file.filename),
    },
    outputPayload: (preparedPayload) => ({
      language: (preparedPayload as Omit<PreparedPullRequestTestsPayload, "critical_functions">).language,
      truncation: (preparedPayload as Omit<PreparedPullRequestTestsPayload, "critical_functions">).truncation,
    }),
    operation: async () => {
      const language = inferPrimaryLanguage(this.requireSource(state).files);
      return {
        language,
        preparedPayload: preparePayload({
          input: state.input,
          source: this.requireSource(state),
          language,
          criticalFunctions: [],
        }),
      };
    },
  });

  private readonly runCriticalFunctionsExtractor = async (
    state: PullRequestTestsState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "critical_functions_extractor",
    kind: "tool",
    inputPayload: {
      language: this.requireLanguage(state),
      changedFiles: this.requireSource(state).files.length,
    },
    outputPayload: (criticalFunctions) => ({
      count: (criticalFunctions as CriticalFunctionCandidate[]).length,
      candidates: (criticalFunctions as CriticalFunctionCandidate[]).map((candidate) => ({
        name: candidate.name,
        kind: candidate.kind,
        file_path: candidate.file_path,
      })),
    }),
    operation: async () => ({
      criticalFunctions: extractCriticalFunctions(this.requireSource(state).files),
    }),
  });

  private readonly runTestsAgent = async (
    state: PullRequestTestsState,
    config?: RunnableConfig,
  ) => this.runRecordedOperation(state, config, {
    nodeName: "tests_agent",
    kind: "llm",
    inputPayload: {
      language: this.requireLanguage(state),
      test_framework: state.input.test_framework,
      criticalFunctions: state.criticalFunctions.length,
    },
    outputPayload: (output) => output,
    operation: async () => ({
      output: await this.runner.run({
        schema: testsResponseSchema,
        schemaName: "PullRequestTestsAgentOutput",
        messages: [
          {
            role: "system",
            content: createPullRequestTestsSystemPrompt(
              state.promptCatalog,
              this.requireLanguage(state),
              state.input.test_framework,
            ),
          },
          {
            role: "user",
            content: JSON.stringify({
              ...this.requirePreparedPayload(state),
              critical_functions: state.criticalFunctions,
            }, null, 2),
          },
        ],
      }),
    }),
  });

  private async runRecordedOperation<TStateUpdate extends Record<string, unknown>, TOutput>(
    state: PullRequestTestsState,
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
    state: PullRequestTestsState,
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
    const stepRecorder = config?.configurable?.stepRecorder as PullRequestTestsStepRecorder | undefined;
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

  private requireSource(state: PullRequestTestsState): GitHubPullRequestSource {
    if (!state.source) {
      throw new GenericError("Dados do GitHub ausentes no fluxo de testes por pull request.");
    }

    return state.source;
  }

  private requireLanguage(state: PullRequestTestsState): SupportedLanguage {
    if (!state.language) {
      throw new GenericError("Linguagem inferida ausente no fluxo de testes por pull request.");
    }

    return state.language;
  }

  private requirePreparedPayload(state: PullRequestTestsState): Omit<PreparedPullRequestTestsPayload, "critical_functions"> {
    if (!state.preparedPayload) {
      throw new GenericError("Payload preparado ausente no fluxo de testes por pull request.");
    }

    return state.preparedPayload;
  }
}

function preparePayload(input: {
  input: PullRequestTestsRequest;
  source: GitHubPullRequestSource;
  language: SupportedLanguage;
  criticalFunctions: CriticalFunctionCandidate[];
}): Omit<PreparedPullRequestTestsPayload, "critical_functions"> {
  const notes: string[] = [];
  const payload = {
    request: input.input,
    language: input.language,
    pull_request: input.source.pullRequest,
    diff: truncateText(input.source.diff, MAX_DIFF_CHARS, "diff", notes),
    changed_files: compactChangedFiles(input.source.files, notes),
    project_context_files: compactContextFiles(input.source.contextFiles, notes),
    truncation: {
      truncated: false,
      notes,
    },
  };

  payload.truncation.truncated = notes.length > 0;

  if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
    notes.push("Payload serializado ainda ficou grande; patches e contexto foram reduzidos.");
    payload.diff = truncateText(payload.diff, 8_000, "diff ajuste final", notes);
    payload.changed_files = payload.changed_files.slice(0, 12).map((file) => ({
      ...file,
      patch: truncateText(file.patch, 700, `patch ajuste final ${file.filename}`, notes),
    }));
    payload.project_context_files = payload.project_context_files.slice(0, 5).map((file) => ({
      ...file,
      content: truncateText(file.content, 1_000, `contexto ajuste final ${file.path}`, notes),
    }));
  }

  payload.truncation.truncated = notes.length > 0;
  return payload;
}

function compactChangedFiles(files: GitHubPullRequestFile[], notes: string[]) {
  if (files.length > MAX_CHANGED_FILES) {
    notes.push(`changed_files limitado de ${files.length} para ${MAX_CHANGED_FILES} arquivos.`);
  }

  return files.slice(0, MAX_CHANGED_FILES).map((file) => ({
    filename: file.filename,
    status: file.status,
    patch: truncateText(file.patch ?? null, MAX_PATCH_CHARS, `patch ${file.filename}`, notes),
  }));
}

function compactContextFiles(files: GitHubPullRequestSource["contextFiles"], notes: string[]) {
  if (files.length > MAX_CONTEXT_FILES) {
    notes.push(`project_context_files limitado de ${files.length} para ${MAX_CONTEXT_FILES} arquivos.`);
  }

  return files.slice(0, MAX_CONTEXT_FILES).map((file) => ({
    path: file.path,
    content: truncateText(file.content, MAX_CONTEXT_CHARS, `contexto ${file.path}`, notes),
  }));
}

function extractCriticalFunctions(files: GitHubPullRequestFile[]): CriticalFunctionCandidate[] {
  const candidates = files.flatMap((file) => extractCriticalFunctionsFromFile(file));

  if (candidates.length > 0) {
    return candidates.slice(0, MAX_CRITICAL_FUNCTIONS);
  }

  return files.slice(0, MAX_CRITICAL_FUNCTIONS).map((file) => ({
    name: file.filename,
    kind: "changed_file",
    file_path: file.filename,
    line_hint: null,
    reason: "Arquivo alterado sem funcao exportada clara; gere testes para o comportamento modificado.",
    snippet: file.patch ?? null,
  }));
}

function extractCriticalFunctionsFromFile(file: GitHubPullRequestFile): CriticalFunctionCandidate[] {
  const lines = (file.patch ?? "").split("\n");
  const candidates: CriticalFunctionCandidate[] = [];

  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const code = line.slice(1).trim();
    const found = candidateFromLine(code, file.filename, index + 1);
    if (found) {
      candidates.push(found);
    }
  }

  return candidates;
}

function candidateFromLine(
  code: string,
  filePath: string,
  lineNumber: number,
): CriticalFunctionCandidate | null {
  const functionMatch = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(code)
    ?? /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/.exec(code);
  if (functionMatch?.[1]) {
    return {
      name: functionMatch[1],
      kind: "function",
      file_path: filePath,
      line_hint: `patch +${lineNumber}`,
      reason: "Funcao alterada ou criada no PR; deve receber testes unitarios diretos.",
      snippet: code,
    };
  }

  const classMatch = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(code);
  if (classMatch?.[1]) {
    return {
      name: classMatch[1],
      kind: "class",
      file_path: filePath,
      line_hint: `patch +${lineNumber}`,
      reason: "Classe alterada ou criada no PR; cubra metodos publicos e invariantes.",
      snippet: code,
    };
  }

  const branchMatch = /\bif\s*\(([^)]+)\)/.exec(code);
  if (branchMatch?.[1]) {
    return {
      name: branchMatch[1],
      kind: "branch",
      file_path: filePath,
      line_hint: `patch +${lineNumber}`,
      reason: "Condicao critica alterada; cubra caminhos verdadeiro e falso.",
      snippet: code,
    };
  }

  const throwMatch = /throw\s+new\s+([A-Za-z_$][\w$]*)/.exec(code);
  if (throwMatch?.[1]) {
    return {
      name: throwMatch[1],
      kind: "error_case",
      file_path: filePath,
      line_hint: `patch +${lineNumber}`,
      reason: "Erro explicito alterado; gere teste de falha esperada.",
      snippet: code,
    };
  }

  return null;
}

function inferPrimaryLanguage(files: GitHubPullRequestFile[]): SupportedLanguage {
  const counts = new Map<SupportedLanguage, number>();

  for (const file of files) {
    const language = languageForPath(file.filename);
    if (language) {
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  if (ranked[0]) {
    return ranked[0][0];
  }

  return "typescript";
}

function languageForPath(filePath: string): SupportedLanguage | null {
  const normalized = filePath.toLowerCase();
  if (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) {
    return "typescript";
  }
  if (normalized.endsWith(".js") || normalized.endsWith(".jsx")) {
    return "javascript";
  }
  if (normalized.endsWith(".py")) {
    return "python";
  }
  if (normalized.endsWith(".php")) {
    return "php";
  }

  return null;
}

function createPullRequestTestsSystemPrompt(
  promptCatalog: TestsPromptCatalog,
  language: SupportedLanguage,
  framework: string,
): string {
  return [
    promptCatalog.getAgentSystemPrompt([
      `Linguagem: ${language}`,
      `Framework: ${framework}`,
      "Origem: pull request do GitHub",
      "Objetivo: Criar testes unitarios para cobertura de funcoes criticas alteradas.",
    ].join("\n")),
    "",
    "Use o diff, o contexto dos arquivos e a lista critical_functions para priorizar os testes.",
    "Retorne um arquivo de teste executavel e focado no framework informado.",
  ].join("\n");
}

function truncateText(value: string, maxChars: number, label: string, notes: string[]): string;
function truncateText(value: null, maxChars: number, label: string, notes: string[]): null;
function truncateText(value: string | null, maxChars: number, label: string, notes: string[]): string | null;
function truncateText(value: string | null, maxChars: number, label: string, notes: string[]): string | null {
  if (value === null || value.length <= maxChars) {
    return value;
  }

  notes.push(`${label} truncado de ${value.length} para ${maxChars} caracteres.`);
  const suffix = `\n\n[TRUNCADO: ${label}; tamanho original ${value.length}; limite ${maxChars}.]`;
  const contentLimit = Math.max(0, maxChars - suffix.length - 8);
  const headLength = Math.ceil(contentLimit * 0.7);
  const tailLength = Math.max(0, contentLimit - headLength);

  return `${value.slice(0, headLength)}\n...\n${tailLength ? value.slice(value.length - tailLength) : ""}${suffix}`;
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido no fluxo de testes por pull request.";
}
