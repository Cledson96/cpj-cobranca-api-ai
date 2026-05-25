import type {
  CodeStandardDocument,
  GitHubContextFile,
  GitHubPullRequestFile,
  JiraIssueSource,
  PullRequestReviewAnalysisContext,
} from "./models";

export const MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS = 90_000;

const MAX_DIFF_CHARS = 12_000;
const MAX_CHANGED_FILES = 25;
const MAX_PATCH_CHARS = 900;
const MAX_CONTEXT_FILES = 8;
const MAX_CONTEXT_FILE_CHARS = 1_200;
const MAX_STANDARD_CHARS = 3_500;
const MAX_JIRA_DESCRIPTION_CHARS = 5_000;
const MAX_JIRA_CRITERIA = 10;
const MAX_JIRA_CRITERION_CHARS = 400;

type TruncationNotes = string[];

export function buildPullRequestReviewPayload(context: PullRequestReviewAnalysisContext) {
  const notes: TruncationNotes = [];
  const payload = {
    request: context.input,
    pull_request: context.source.pullRequest,
    diff: truncateText(context.source.diff, MAX_DIFF_CHARS, "diff", notes),
    changed_files: compactChangedFiles(context.source.files, notes),
    project_context_files: compactContextFiles(context.source.contextFiles, notes),
    code_standards: compactStandards(context.standards, notes),
    jira: compactJira(context.jira, notes),
    truncation: {
      truncated: false,
      notes,
      limits: {
        max_payload_chars: MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS,
        max_diff_chars: MAX_DIFF_CHARS,
        max_changed_files: MAX_CHANGED_FILES,
        max_patch_chars: MAX_PATCH_CHARS,
        max_context_files: MAX_CONTEXT_FILES,
        max_context_file_chars: MAX_CONTEXT_FILE_CHARS,
        max_standard_chars: MAX_STANDARD_CHARS,
      },
    },
  };

  payload.truncation.truncated = notes.length > 0;
  return fitSerializedPayload(payload, notes);
}

function compactChangedFiles(files: GitHubPullRequestFile[], notes: TruncationNotes) {
  if (files.length > MAX_CHANGED_FILES) {
    notes.push(`changed_files limitado de ${files.length} para ${MAX_CHANGED_FILES} arquivos.`);
  }

  return files.slice(0, MAX_CHANGED_FILES).map((file) => ({
    filename: file.filename,
    status: file.status,
    raw_url: file.raw_url ?? null,
    patch: truncateText(file.patch ?? null, MAX_PATCH_CHARS, `patch ${file.filename}`, notes),
  }));
}

function compactContextFiles(files: GitHubContextFile[], notes: TruncationNotes) {
  if (files.length > MAX_CONTEXT_FILES) {
    notes.push(`project_context_files limitado de ${files.length} para ${MAX_CONTEXT_FILES} arquivos.`);
  }

  return files.slice(0, MAX_CONTEXT_FILES).map((file) => ({
    path: file.path,
    content: truncateText(file.content, MAX_CONTEXT_FILE_CHARS, `contexto ${file.path}`, notes),
  }));
}

function compactStandards(standards: CodeStandardDocument[], notes: TruncationNotes) {
  return standards.map((standard) => ({
    technology: standard.technology,
    content: truncateText(standard.content, MAX_STANDARD_CHARS, `padrao ${standard.technology}`, notes),
  }));
}

function compactJira(jira: JiraIssueSource | null, notes: TruncationNotes) {
  if (!jira) {
    return null;
  }

  if (jira.acceptance_criteria.length > MAX_JIRA_CRITERIA) {
    notes.push(`acceptance_criteria limitado de ${jira.acceptance_criteria.length} para ${MAX_JIRA_CRITERIA} itens.`);
  }

  return {
    issue_key: jira.issue_key,
    summary: jira.summary,
    description: truncateText(jira.description, MAX_JIRA_DESCRIPTION_CHARS, "descricao Jira", notes),
    acceptance_criteria: jira.acceptance_criteria.slice(0, MAX_JIRA_CRITERIA).map((criterion, index) => (
      truncateText(criterion, MAX_JIRA_CRITERION_CHARS, `criterio Jira ${index + 1}`, notes)
    )),
  };
}

function fitSerializedPayload<TPayload extends {
  diff: string;
  changed_files: Array<{ patch: string | null }>;
  project_context_files: Array<{ content: string }>;
  code_standards: Array<{ content: string }>;
  jira: {
    description: string;
    acceptance_criteria: string[];
  } | null;
  truncation: {
    truncated: boolean;
    notes: TruncationNotes;
  };
}>(payload: TPayload, notes: TruncationNotes): TPayload {
  if (JSON.stringify(payload).length <= MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS) {
    return payload;
  }

  notes.push("Payload serializado ainda ficou grande; aplicando reducao adicional.");
  payload.diff = truncateText(payload.diff, 6_000, "diff ajuste final", notes);
  payload.changed_files = payload.changed_files.slice(0, 12).map((file, index) => ({
    ...file,
    patch: truncateText(file.patch, 500, `patch ajuste final ${index + 1}`, notes),
  }));
  payload.project_context_files = payload.project_context_files.slice(0, 4).map((file, index) => ({
    ...file,
    content: truncateText(file.content, 700, `contexto ajuste final ${index + 1}`, notes),
  }));
  payload.code_standards = payload.code_standards.map((standard) => ({
    ...standard,
    content: truncateText(standard.content, 2_000, "padrao ajuste final", notes),
  }));

  if (payload.jira) {
    payload.jira.description = truncateText(payload.jira.description, 2_500, "descricao Jira ajuste final", notes);
    payload.jira.acceptance_criteria = payload.jira.acceptance_criteria.slice(0, 5).map((criterion, index) => (
      truncateText(criterion, 250, `criterio Jira ajuste final ${index + 1}`, notes)
    ));
  }

  if (JSON.stringify(payload).length > MAX_PULL_REQUEST_REVIEW_PAYLOAD_CHARS) {
    notes.push("Payload serializado exigiu modo minimo; patches e contexto de projeto foram omitidos.");
    payload.diff = truncateText(payload.diff, 3_000, "diff modo minimo", notes);
    payload.changed_files = payload.changed_files.slice(0, 10).map((file) => ({
      ...file,
      patch: null,
    }));
    payload.project_context_files = [];
    payload.code_standards = payload.code_standards.map((standard) => ({
      ...standard,
      content: truncateText(standard.content, 1_000, "padrao modo minimo", notes),
    }));
  }

  payload.truncation.truncated = notes.length > 0;
  return payload;
}

function truncateText(
  value: string,
  maxChars: number,
  label: string,
  notes: TruncationNotes,
): string;
function truncateText(
  value: null,
  maxChars: number,
  label: string,
  notes: TruncationNotes,
): null;
function truncateText(
  value: string | null,
  maxChars: number,
  label: string,
  notes: TruncationNotes,
): string | null;
function truncateText(
  value: string | null,
  maxChars: number,
  label: string,
  notes: TruncationNotes,
): string | null {
  if (value === null || value.length <= maxChars) {
    return value;
  }

  notes.push(`${label} truncado de ${value.length} para ${maxChars} caracteres.`);
  const suffix = `\n\n[TRUNCADO: ${label}; tamanho original ${value.length}; limite ${maxChars}.]`;
  const contentLimit = Math.max(0, maxChars - suffix.length - 8);
  const headLength = Math.ceil(contentLimit * 0.7);
  const tailLength = Math.max(0, contentLimit - headLength);
  const head = value.slice(0, headLength);
  const tail = tailLength > 0 ? value.slice(value.length - tailLength) : "";

  return `${head}\n...\n${tail}${suffix}`;
}
