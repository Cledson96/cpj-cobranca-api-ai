import type {
  PullRequestReviewRequest,
  PullRequestReviewResponse,
} from "@shared";
import type { AgentExecutionTelemetrySource } from "@/modules/agent";

export type ParsedGitHubPullRequestUrl = {
  owner: string;
  repo: string;
  number: number;
};

export type GitHubPullRequestFile = {
  filename: string;
  status: string;
  patch?: string | null;
  raw_url?: string | null;
};

export type GitHubContextFile = {
  path: string;
  content: string;
};

export type GitHubPullRequestSource = {
  pullRequest: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    baseBranch: string;
    headSha: string;
    changedFiles: number;
  };
  diff: string;
  files: GitHubPullRequestFile[];
  contextFiles: GitHubContextFile[];
};

export type JiraIssueSource = {
  issue_key: string;
  summary: string;
  description: string;
  acceptance_criteria: string[];
};

export type CodeStandardDocument = {
  technology: "node-typescript" | "php" | "python";
  content: string;
};

export type PullRequestReviewAnalysisContext = {
  input: PullRequestReviewRequest;
  source: GitHubPullRequestSource;
  jira: JiraIssueSource | null;
  standards: CodeStandardDocument[];
  resolvedModel?: string;
};

export interface GitHubPullRequestClient {
  fetchPullRequest(input: PullRequestReviewRequest): Promise<GitHubPullRequestSource>;
}

export interface JiraIssueClient {
  fetchIssue(issueKey: string): Promise<JiraIssueSource>;
}

export interface CodeStandardsLoader {
  loadForFiles(filePaths: string[]): Promise<CodeStandardDocument[]>;
}

export interface PullRequestReviewAnalyzer {
  execute(context: PullRequestReviewAnalysisContext): Promise<PullRequestReviewResponse>;
  getTelemetrySource?(): AgentExecutionTelemetrySource | undefined;
}

export interface PullRequestReviewService {
  execute(input: PullRequestReviewRequest): Promise<PullRequestReviewResponse>;
}
