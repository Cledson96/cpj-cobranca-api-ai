"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Drawer, Form, Select, Space, Table, Tag, Timeline, Typography } from "antd";
import { JsonViewer } from "@/components/json-viewer";
import { api } from "@/lib/api-client";
import { formatDateTime, formatDuration, formatInteger, formatUsd } from "@/lib/format";
import type {
  ExecutionFlowType,
  ExecutionStatus,
  HistoryDetail,
  HistoryItem,
  HistoryListQuery,
  HistoryListResponse,
} from "@/lib/types";

const flowOptions: ExecutionFlowType[] = ["review", "compliance", "document", "tests", "batch", "pull_request_review"];
const statusOptions: ExecutionStatus[] = ["pending", "success", "failed"];

export function HistoryPage() {
  const [form] = Form.useForm<HistoryListQuery>();
  const [history, setHistory] = useState<HistoryListResponse | null>(null);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = async (query: HistoryListQuery = { limit: 20 }) => {
    setLoading(true);
    try {
      const output = await api.listHistory(query);
      setHistory(output);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar historico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory({ limit: 20 });
  }, []);

  const applyFilters = () => {
    const values = form.getFieldsValue();
    void loadHistory({ ...values, limit: 20 });
  };

  const openDetail = async (id: string) => {
    const output = await api.getHistoryDetail(id);
    setDetail(output);
  };

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Rastreabilidade e telemetria</Typography.Text>
          <Typography.Title level={1}>Historico</Typography.Title>
        </Space>
      </header>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <Card className="glass-card">
        <Form form={form} layout="inline" initialValues={{ limit: 20 }}>
          <Form.Item label="Fluxo" name="flow_type">
            <Select
              aria-label="Fluxo"
              allowClear
              style={{ width: 190 }}
              options={flowOptions.map((value) => ({ value, label: value, title: value }))}
            />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              aria-label="Status"
              allowClear
              style={{ width: 150 }}
              options={statusOptions.map((value) => ({ value, label: value, title: value }))}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="glass-card">
        <Table<HistoryItem>
          rowKey="id"
          loading={loading}
          dataSource={history?.items ?? []}
          pagination={false}
          columns={[
            { title: "ID", dataIndex: "id" },
            { title: "Fluxo", dataIndex: "type" },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: ExecutionStatus) => <Tag color={status === "success" ? "green" : status === "failed" ? "red" : "blue"}>{status}</Tag>,
            },
            { title: "Quando", dataIndex: "timestamp", render: formatDateTime },
            { title: "Duracao", dataIndex: "duration_ms", render: formatDuration },
            { title: "Tokens", render: (_, item) => formatInteger(item.telemetry?.total_tokens) },
            { title: "Custo", render: (_, item) => formatUsd(item.telemetry?.cost_total_usd) },
            {
              title: "Detalhes",
              render: (_, item) => (
                <Button onClick={() => void openDetail(item.id)}>
                  Ver detalhes
                </Button>
              ),
            },
          ]}
        />
        {history?.page.next_cursor ? (
          <Button
            style={{ marginTop: 16 }}
            onClick={() => void loadHistory({ ...form.getFieldsValue(), limit: history.page.limit, cursor: history.page.next_cursor ?? undefined })}
          >
            Proxima pagina
          </Button>
        ) : null}
      </Card>

      <Drawer
        title={detail ? `Execucao ${detail.id}` : "Detalhe"}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="large"
      >
        {detail ? (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Typography.Title level={4}>Telemetria</Typography.Title>
            <JsonViewer value={detail.telemetry} />
            <Typography.Title level={4}>Steps</Typography.Title>
            <Timeline
              items={detail.steps.map((step) => ({
                color: step.status === "success" ? "green" : step.status === "failed" ? "red" : "blue",
                children: `${step.node_name} (${step.kind}) - ${formatDuration(step.duration_ms)}`,
              }))}
            />
            <Typography.Title level={4}>Entrada</Typography.Title>
            <JsonViewer value={detail.input_payload} />
            <Typography.Title level={4}>Saida</Typography.Title>
            <JsonViewer value={detail.output_payload} />
          </Space>
        ) : null}
      </Drawer>
    </main>
  );
}
