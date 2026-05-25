import { Buffer } from "node:buffer";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";
import { type AppEnv, loadEnv, type PullRequestReviewRequest } from "@shared";
import { parseGitHubPullRequestUrl } from "./github-url";
import type {
  GitHubContextFile,
  GitHubPullRequestClient,
  GitHubPullRequestFile,
  GitHubPullRequestSource,
} from "./models";

type GitHubPullResponse = {
  title?: string;
  changed_files?: number;
  base?: { ref?: string };
  head?: { sha?: string };
};

type GitHubFileResponse = {
  filename: string;
  status: string;
  patch?: string | null;
  raw_url?: string | null;
};

type GitHubContentsResponse = {
  content?: string;
  encoding?: string;
};

export class HttpGitHubPullRequestClient implements GitHubPullRequestClient {
  constructor(private readonly env: AppEnv = loadEnv()) {}

  async fetchPullRequest(input: PullRequestReviewRequest): Promise<GitHubPullRequestSource> {
    if (!this.env.GITHUB_TOKEN) {
      throw new GenericError("GITHUB_TOKEN nao configurado para consultar pull request.");
    }

    const parsed = parseGitHubPullRequestUrl(input.github_pull_request_url);
    const basePath = `/repos/${parsed.owner}/${parsed.repo}`;

    try {
      const [pull, diff, files] = await Promise.all([
        this.getJson<GitHubPullResponse>(`${basePath}/pulls/${parsed.number}`),
        this.getText(`${basePath}/pulls/${parsed.number}`, "application/vnd.github.v3.diff"),
        this.getJson<GitHubFileResponse[]>(`${basePath}/pulls/${parsed.number}/files?per_page=100`),
      ]);

      const contextFiles = await this.fetchContextFiles({
        owner: parsed.owner,
        repo: parsed.repo,
        baseBranch: input.base_branch,
        files,
      });

      return {
        pullRequest: {
          owner: parsed.owner,
          repo: parsed.repo,
          number: parsed.number,
          title: pull.title ?? `Pull request #${parsed.number}`,
          baseBranch: input.base_branch,
          headSha: pull.head?.sha ?? "",
          changedFiles: pull.changed_files ?? files.length,
        },
        diff,
        files,
        contextFiles,
      };
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  private async fetchContextFiles(input: {
    owner: string;
    repo: string;
    baseBranch: string;
    files: GitHubPullRequestFile[];
  }): Promise<GitHubContextFile[]> {
    const contextFiles: GitHubContextFile[] = [];

    for (const file of input.files.slice(0, 12)) {
      if (!file.filename) {
        continue;
      }

      const encodedPath = file.filename.split("/").map(encodeURIComponent).join("/");
      try {
        const content = await this.getJson<GitHubContentsResponse>(
          `/repos/${input.owner}/${input.repo}/contents/${encodedPath}?ref=${encodeURIComponent(input.baseBranch)}`,
        );

        if (content.encoding === "base64" && content.content) {
          contextFiles.push({
            path: file.filename,
            content: Buffer.from(content.content, "base64").toString("utf8"),
          });
        }
      } catch {
        // Arquivos novos ou removidos podem nao existir na base; o diff ainda sera analisado.
      }
    }

    return contextFiles;
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.request(path, "application/vnd.github+json");
    return response.json() as Promise<T>;
  }

  private async getText(path: string, accept: string): Promise<string> {
    const response = await this.request(path, accept);
    return response.text();
  }

  private async request(path: string, accept: string): Promise<Response> {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        "Accept": accept,
        "Authorization": `Bearer ${this.env.GITHUB_TOKEN}`,
        "User-Agent": "cpj-cobranca-api-ai",
      },
    });

    if (!response.ok) {
      throw new GenericError(`GitHub retornou ${response.status} ao consultar pull request.`);
    }

    return response;
  }
}
