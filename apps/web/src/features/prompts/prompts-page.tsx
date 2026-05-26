"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { api, type PromptCreatePayload } from "@/lib/api-client";
import type { PromptBlockKey, PromptDetail, PromptFlowType, PromptSummary } from "@/lib/types";

const promptFlows: PromptFlowType[] = ["document", "review", "compliance", "tests", "pull_request_review"];
const blockKeysByFlow: Record<PromptFlowType, PromptBlockKey[]> = {
  document: ["agent"],
  compliance: ["agent"],
  tests: ["agent"],
  review: ["naming_clarity", "error_handling", "resource_leak", "complexity", "security", "aggregator"],
  pull_request_review: ["code_standard", "jira_criteria", "project_consistency", "security", "aggregator"],
};

export function PromptsPage() {
  const [flow, setFlow] = useState<PromptFlowType>("document");
  const [items, setItems] = useState<PromptSummary[]>([]);
  const [active, setActive] = useState<PromptDetail | null>(null);
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<Record<string, string>>({ agent: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const blockKeys = useMemo(() => blockKeysByFlow[flow], [flow]);

  const load = async (nextFlow = flow) => {
    setLoading(true);
    try {
      const [list, activePrompt] = await Promise.all([
        api.listPrompts(nextFlow),
        api.getActivePrompt(nextFlow),
      ]);
      setItems(list.items);
      setActive(activePrompt);
      setBlocks(Object.fromEntries(activePrompt.blocks.map((block) => [block.block_key, block.system_prompt])));
      setName("");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar prompts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(flow);
  }, [flow]);

  const createPrompt = async () => {
    const payload: PromptCreatePayload = {
      flow_type: flow,
      name,
      blocks: blockKeys.map((block_key) => ({
        block_key,
        system_prompt: blocks[block_key] ?? "",
      })),
    };

    await api.createPrompt(payload);
    await load(flow);
  };

  const activatePrompt = async (version: number) => {
    await api.activatePrompt(flow, version);
    await load(flow);
  };

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Catalogo versionado</Typography.Text>
          <Typography.Title level={1}>Prompts</Typography.Title>
        </Space>
        <Select
          aria-label="Fluxo de prompt"
          value={flow}
          style={{ width: 240 }}
          onChange={setFlow}
          options={promptFlows.map((value) => ({ value, label: value }))}
        />
      </header>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <Card title="Versao ativa" className="glass-card" loading={loading}>
        <Typography.Title level={3}>{active?.name ?? "Sem prompt ativo"}</Typography.Title>
        <Typography.Text type="secondary">
          {active ? `v${active.version} - blocos: ${active.block_keys.join(", ")}` : "Cadastre uma versao para este fluxo."}
        </Typography.Text>
      </Card>

      <Card title="Criar nova versao" className="glass-card">
        <Space orientation="vertical" size={14} style={{ width: "100%" }}>
          <label>
            <Typography.Text>Nome da versao</Typography.Text>
            <Input
              aria-label="Nome da versao"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Document v2"
            />
          </label>
          {blockKeys.map((blockKey) => (
            <label key={blockKey}>
              <Typography.Text>Prompt do bloco {blockKey}</Typography.Text>
              <Input.TextArea
                aria-label={`Prompt do bloco ${blockKey}`}
                value={blocks[blockKey] ?? ""}
                rows={5}
                onChange={(event) => setBlocks((current) => ({
                  ...current,
                  [blockKey]: event.target.value,
                }))}
              />
            </label>
          ))}
          <Button type="primary" onClick={() => void createPrompt()} disabled={!name.trim()}>
            Criar versao
          </Button>
        </Space>
      </Card>

      <Card title="Versoes cadastradas" className="glass-card">
        <Table<PromptSummary>
          rowKey={(item) => `${item.flow_type}-${item.version}`}
          dataSource={items}
          loading={loading}
          pagination={false}
          columns={[
            { title: "Nome", dataIndex: "name" },
            { title: "Versao", dataIndex: "version", render: (version) => `v${version}` },
            {
              title: "Status",
              dataIndex: "is_active",
              render: (isActive) => isActive ? <Tag color="green">ativo</Tag> : <Tag>inativo</Tag>,
            },
            { title: "Blocos", dataIndex: "block_keys", render: (keys: string[]) => keys.join(", ") },
            {
              title: "Acao",
              render: (_, item) => (
                <Button onClick={() => void activatePrompt(item.version)}>
                  Ativar v{item.version}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </main>
  );
}
