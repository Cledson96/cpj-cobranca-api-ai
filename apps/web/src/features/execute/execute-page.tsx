"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Tabs, Typography } from "antd";
import { JsonViewer } from "@/components/json-viewer";
import { api } from "@/lib/api-client";
import type { Language } from "@/lib/types";

const languageOptions: Language[] = ["typescript", "javascript", "python", "php"];

export function ExecutePage() {
  const [language, setLanguage] = useState<Language>("typescript");
  const [code, setCode] = useState("");
  const [context, setContext] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [docType, setDocType] = useState<"technical" | "operational">("technical");
  const [framework, setFramework] = useState("vitest");
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [batchJson, setBatchJson] = useState("{\n  \"continue_on_error\": true,\n  \"items\": []\n}");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (executor: () => Promise<unknown>) => {
    setLoading(true);
    try {
      const output = await executor();
      setResult(output);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao executar fluxo.");
    } finally {
      setLoading(false);
    }
  };

  const commonFields = (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      <label>
        <Typography.Text>Codigo</Typography.Text>
        <Input.TextArea
          aria-label="Codigo"
          value={code}
          rows={8}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Cole o codigo aqui"
        />
      </label>
      <label>
        <Typography.Text>Linguagem</Typography.Text>
        <Select
          aria-label="Linguagem"
          value={language}
          style={{ width: 220 }}
          onChange={setLanguage}
          options={languageOptions.map((value) => ({ value, label: value }))}
        />
      </label>
    </Space>
  );

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Execucao guiada</Typography.Text>
          <Typography.Title level={1}>Executar fluxos</Typography.Title>
        </Space>
      </header>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <Card className="glass-card">
        <Tabs
          items={[
            {
              key: "review",
              label: "Review",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  {commonFields}
                  <label>
                    <Typography.Text>Contexto opcional</Typography.Text>
                    <Input value={context} onChange={(event) => setContext(event.target.value)} />
                  </label>
                  <Typography.Text type="secondary">Streaming SSE disponivel em /api/v1/review/stream para evolucao incremental.</Typography.Text>
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={() => void run(() => api.runReview({
                      code,
                      language,
                      ...(context.trim() ? { context } : {}),
                    }))}
                  >
                    Executar review
                  </Button>
                </Space>
              ),
            },
            {
              key: "compliance",
              label: "Compliance",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  <label>
                    <Typography.Text>Descricao da tarefa</Typography.Text>
                    <Input.TextArea value={taskDescription} rows={4} onChange={(event) => setTaskDescription(event.target.value)} />
                  </label>
                  {commonFields}
                  <Button type="primary" loading={loading} onClick={() => void run(() => api.runCompliance({ task_description: taskDescription, code, language }))}>
                    Executar compliance
                  </Button>
                </Space>
              ),
            },
            {
              key: "document",
              label: "Document",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  {commonFields}
                  <Select
                    aria-label="Tipo de documento"
                    value={docType}
                    style={{ width: 220 }}
                    onChange={setDocType}
                    options={[
                      { value: "technical", label: "technical" },
                      { value: "operational", label: "operational" },
                    ]}
                  />
                  <Button type="primary" loading={loading} onClick={() => void run(() => api.runDocument({ code, language, doc_type: docType }))}>
                    Executar document
                  </Button>
                </Space>
              ),
            },
            {
              key: "tests",
              label: "Tests",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  {commonFields}
                  <label>
                    <Typography.Text>Framework</Typography.Text>
                    <Input value={framework} onChange={(event) => setFramework(event.target.value)} />
                  </label>
                  <Button type="primary" loading={loading} onClick={() => void run(() => api.runTests({ code, language, test_framework: framework }))}>
                    Executar tests
                  </Button>
                </Space>
              ),
            },
            {
              key: "pull-request-review",
              label: "PR Review",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  <Input placeholder="https://github.com/org/repo/pull/123" value={pullRequestUrl} onChange={(event) => setPullRequestUrl(event.target.value)} />
                  <Input placeholder="Jira opcional" value={jiraKey} onChange={(event) => setJiraKey(event.target.value)} />
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={() => void run(() => api.runPullRequestReview({
                      github_pull_request_url: pullRequestUrl,
                      ...(jiraKey.trim() ? { jira_issue_key: jiraKey } : {}),
                    }))}
                  >
                    Executar PR review
                  </Button>
                </Space>
              ),
            },
            {
              key: "pull-request-tests",
              label: "PR Tests",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  <Input placeholder="https://github.com/org/repo/pull/123" value={pullRequestUrl} onChange={(event) => setPullRequestUrl(event.target.value)} />
                  <Input placeholder="Framework" value={framework} onChange={(event) => setFramework(event.target.value)} />
                  <Button type="primary" loading={loading} onClick={() => void run(() => api.runPullRequestTests({ github_pull_request_url: pullRequestUrl, test_framework: framework }))}>
                    Executar PR tests
                  </Button>
                </Space>
              ),
            },
            {
              key: "batch",
              label: "Batch",
              children: (
                <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                  <Input.TextArea rows={10} value={batchJson} onChange={(event) => setBatchJson(event.target.value)} />
                  <Button type="primary" loading={loading} onClick={() => void run(() => api.runBatch(JSON.parse(batchJson)))}>
                    Executar batch
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {result ? (
        <Card title="Resultado" className="glass-card">
          <JsonViewer value={result} />
        </Card>
      ) : null}
    </main>
  );
}
