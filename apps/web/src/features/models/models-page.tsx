"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, Space, Switch, Table, Tag, Typography } from "antd";
import { api } from "@/lib/api-client";
import type { ModelDetail } from "@/lib/types";

export function ModelsPage() {
  const [items, setItems] = useState<ModelDetail[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const output = await api.listModels();
      setItems(output.items);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar modelos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createModel = async () => {
    await api.createModel({ name });
    setName("");
    await load();
  };

  const updateModel = async (id: string, payload: { is_active?: boolean; is_default?: boolean }) => {
    await api.updateModel(id, payload);
    await load();
  };

  const deleteModel = async (id: string) => {
    await api.deleteModel(id);
    await load();
  };

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Catalogo permitido da API</Typography.Text>
          <Typography.Title level={1}>Modelos</Typography.Title>
        </Space>
      </header>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <Card title="Cadastrar modelo" className="glass-card">
        <Space.Compact style={{ width: "100%" }}>
          <Input
            aria-label="Nome do modelo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="openai/gpt-4o-mini"
          />
          <Button type="primary" onClick={() => void createModel()} disabled={!name.trim()}>
            Cadastrar modelo
          </Button>
        </Space.Compact>
      </Card>

      <Card title="Modelos cadastrados" className="glass-card">
        <Table<ModelDetail>
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={false}
          columns={[
            { title: "Modelo", dataIndex: "name" },
            {
              title: "Ativo",
              render: (_, item) => (
                <Switch
                  checked={item.is_active}
                  disabled={item.is_default}
                  onChange={(checked) => void updateModel(item.id, { is_active: checked })}
                />
              ),
            },
            {
              title: "Padrao",
              render: (_, item) => item.is_default ? <Tag color="green">padrao</Tag> : (
                <Button
                  aria-label={`Definir ${item.name} como padrao`}
                  onClick={() => void updateModel(item.id, { is_default: true })}
                >
                  Definir padrao
                </Button>
              ),
            },
            {
              title: "Excluir",
              render: (_, item) => (
                <Button danger disabled={item.is_default} onClick={() => void deleteModel(item.id)}>
                  Excluir
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </main>
  );
}
