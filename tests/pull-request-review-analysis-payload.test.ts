import { describe, expect, it } from "vitest";
import {
  MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS,
  buildPullRequestReviewPayload,
} from "@/modules/review/pull-request/analysis-payload";
import type { PullRequestReviewAnalysisContext } from "@/modules/review/pull-request";

function repeated(label: string, size: number): string {
  return Array.from({ length: size }, (_, index) => `${label} ${index};`).join("\n");
}

describe("buildPullRequestReviewPayload", () => {
  it("limita o payload enviado ao LLM para PRs grandes", () => {
    const context: PullRequestReviewAnalysisContext = {
      input: {
        github_pull_request_url: "https://github.com/acme/app/pull/42",
        base_branch: "main",
      },
      source: {
        pullRequest: {
          owner: "acme",
          repo: "app",
          number: 42,
          title: "Large PR",
          baseBranch: "main",
          headSha: "abc123",
          changedFiles: 60,
        },
        diff: repeated("+const hugeDiff = true", 20_000),
        files: Array.from({ length: 60 }, (_, index) => ({
          filename: `src/file-${index}.ts`,
          status: "modified",
          patch: repeated(`+export const value${index} =`, 1_000),
          raw_url: `https://raw.githubusercontent.com/acme/app/abc123/src/file-${index}.ts`,
        })),
        contextFiles: Array.from({ length: 30 }, (_, index) => ({
          path: `src/context-${index}.ts`,
          content: repeated(`export class Context${index}`, 1_000),
        })),
      },
      jira: {
        issue_key: "CPJ-123",
        summary: "Implementar fluxo grande",
        description: repeated("criterio de aceite", 4_000),
        acceptance_criteria: Array.from({ length: 20 }, (_, index) => repeated(`criterio ${index}`, 200)),
      },
      standards: [
        { technology: "node-typescript", content: repeated("padrao node", 4_000) },
        { technology: "php", content: repeated("padrao php", 4_000) },
        { technology: "python", content: repeated("padrao python", 4_000) },
      ],
      resolvedModel: "openai/gpt-4o-mini",
    };

    const payload = buildPullRequestReviewPayload(context);
    const serialized = JSON.stringify(payload);

    expect(serialized.length).toBeLessThanOrEqual(MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS);
    expect(payload.truncation.truncated).toBe(true);
    expect(payload.changed_files.length).toBeLessThan(context.source.files.length);
    expect(payload.project_context_files.length).toBeLessThan(context.source.contextFiles.length);
    expect(payload.truncation.notes.length).toBeGreaterThan(0);
  });
});
