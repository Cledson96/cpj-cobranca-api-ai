import { Buffer } from "node:buffer";
import { GenericError } from "@/infrastructure/errors";
import { retryHttpOperation, type AppEnv, loadEnv } from "@shared";
import type { JiraIssueClient, JiraIssueSource } from "./models";

type JiraIssueResponse = {
  key: string;
  fields?: {
    summary?: string;
    description?: unknown;
  };
};

export class HttpJiraIssueClient implements JiraIssueClient {
  constructor(private readonly env: AppEnv = loadEnv()) {}

  async fetchIssue(issueKey: string): Promise<JiraIssueSource> {
    if (!this.env.JIRA_BASE_URL || !this.env.JIRA_EMAIL || !this.env.JIRA_API_TOKEN) {
      throw new GenericError("Credenciais do Jira nao configuradas para consultar criterios do card.");
    }

    const response = await retryHttpOperation({
      operation: () => fetch(
        `${this.env.JIRA_BASE_URL}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,description`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Basic ${Buffer.from(`${this.env.JIRA_EMAIL}:${this.env.JIRA_API_TOKEN}`).toString("base64")}`,
          },
        },
      ),
      maxAttempts: this.env.EXTERNAL_RETRY_ATTEMPTS,
      baseDelayMs: this.env.EXTERNAL_RETRY_BASE_DELAY_MS,
    });

    if (!response.ok) {
      throw new GenericError(`Jira retornou ${response.status} ao consultar o card ${issueKey}.`);
    }

    const issue = await response.json() as JiraIssueResponse;
    const description = adfToText(issue.fields?.description);

    return {
      issue_key: issue.key,
      summary: issue.fields?.summary ?? issue.key,
      description,
      acceptance_criteria: extractAcceptanceCriteria(description),
    };
  }
}

function adfToText(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  const record = input as Record<string, unknown>;
  const ownText = typeof record.text === "string" ? record.text : "";
  const content = Array.isArray(record.content)
    ? record.content.map(adfToText).filter(Boolean).join(" ")
    : "";

  return [ownText, content].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function extractAcceptanceCriteria(description: string): string[] {
  const lines = description
    .split(/\r?\n|(?=- )|(?=\* )/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletLines = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim());

  if (bulletLines.length > 0) {
    return bulletLines;
  }

  return description ? [description] : [];
}
