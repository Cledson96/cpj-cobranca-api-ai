"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Col, Row, Space, Table, Typography } from "antd";
import { MetricCard } from "@/components/metric-card";
import { api } from "@/lib/api-client";
import { formatDuration, formatInteger, formatUsd } from "@/lib/format";
import type { UsageResponse } from "@/lib/types";

export function DashboardPage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.getUsage()
      .then((output) => {
        if (active) {
          setUsage(output);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Falha ao carregar analytics.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = usage?.totals;

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Painel operacional</Typography.Text>
          <Typography.Title level={1}>Dashboard</Typography.Title>
        </Space>
        <Typography.Text type="secondary">Custos exibidos em USD oficial da telemetria.</Typography.Text>
      </header>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <section className="metric-grid" aria-label="KPIs de consumo">
        <MetricCard label="Execucoes" value={formatInteger(totals?.executions)} helper={`${formatInteger(totals?.successful)} sucesso / ${formatInteger(totals?.failed)} falhas`} />
        <MetricCard label="Tokens" value={formatInteger(totals?.total_tokens)} helper={`${formatInteger(totals?.prompt_tokens)} entrada + ${formatInteger(totals?.completion_tokens)} saida`} tone="green" />
        <MetricCard label="Custo total" value={formatUsd(totals?.cost_total_usd)} helper="USD persistido pelo provedor" tone="amber" />
        <MetricCard label="Tempo medio" value={formatDuration(totals?.average_duration_ms)} helper={`${formatInteger(totals?.cache_hits)} cache hits`} tone="red" />
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Consumo por fluxo" loading={loading} className="glass-card">
            <Table
              rowKey="flow_type"
              size="small"
              pagination={false}
              dataSource={usage?.by_flow ?? []}
              columns={[
                { title: "Fluxo", dataIndex: "flow_type" },
                { title: "Execucoes", dataIndex: "executions", render: formatInteger },
                { title: "Tokens", dataIndex: "total_tokens", render: formatInteger },
                { title: "Custo", dataIndex: "cost_total_usd", render: formatUsd },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Consumo por modelo" loading={loading} className="glass-card">
            <Table
              rowKey="model"
              size="small"
              pagination={false}
              dataSource={usage?.by_model ?? []}
              columns={[
                { title: "Modelo", dataIndex: "model" },
                { title: "Execucoes", dataIndex: "executions", render: formatInteger },
                { title: "Tokens", dataIndex: "total_tokens", render: formatInteger },
                { title: "Custo", dataIndex: "cost_total_usd", render: formatUsd },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </main>
  );
}
