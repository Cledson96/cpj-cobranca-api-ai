"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Alert, Card, Space, Table, Tag, Typography } from "antd";
import { MetricCard } from "@/components/metric-card";
import { api } from "@/lib/api-client";
import { formatDuration, formatInteger, formatUsd } from "@/lib/format";
import type { UsageResponse } from "@/lib/types";

type RankingItem = {
  name: string;
  executions: number;
  total_tokens: number;
  cost_total_usd: number;
};

function percent(part = 0, total = 0) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function trendLabel(date: string) {
  const [, month = "", day = ""] = date.split("-");
  return `${day}/${month}`;
}

function chartHeight(value: number, max: number) {
  if (max <= 0) {
    return 12;
  }

  return Math.max(12, Math.round((value / max) * 100));
}

function topBy<T extends RankingItem>(items: T[]) {
  return [...items].sort((left, right) => right.total_tokens - left.total_tokens)[0];
}

function asRankingByFlow(usage: UsageResponse | null): RankingItem[] {
  return (usage?.by_flow ?? []).map((item) => ({
    name: item.flow_type,
    executions: item.executions,
    total_tokens: item.total_tokens,
    cost_total_usd: item.cost_total_usd,
  }));
}

function asRankingByModel(usage: UsageResponse | null): RankingItem[] {
  return (usage?.by_model ?? []).map((item) => ({
    name: item.model,
    executions: item.executions,
    total_tokens: item.total_tokens,
    cost_total_usd: item.cost_total_usd,
  }));
}

function RankingList({ items }: { items: RankingItem[] }) {
  const maxTokens = Math.max(...items.map((item) => item.total_tokens), 1);

  if (items.length === 0) {
    return <div className="empty-visual">Sem dados suficientes para ranking.</div>;
  }

  return (
    <div className="ranking-list">
      {items.slice(0, 5).map((item) => (
        <div className="ranking-item" key={item.name}>
          <div className="ranking-item__top">
            <span className="ranking-item__name">{item.name}</span>
            <span className="ranking-item__value">{formatInteger(item.total_tokens)} tok</span>
          </div>
          <div className="ranking-item__bar" aria-hidden="true">
            <div className="ranking-item__fill" style={{ width: `${chartHeight(item.total_tokens, maxTokens)}%` }} />
          </div>
          <Typography.Text type="secondary">
            {formatInteger(item.executions)} execucoes / {formatUsd(item.cost_total_usd)}
          </Typography.Text>
        </div>
      ))}
    </div>
  );
}

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
  const totalExecutions = totals?.executions ?? 0;
  const successRate = percent(totals?.successful, totalExecutions);
  const failureRate = percent(totals?.failed, totalExecutions);
  const cacheRate = percent(totals?.cache_hits, totalExecutions);
  const costPerExecution = totalExecutions > 0 ? (totals?.cost_total_usd ?? 0) / totalExecutions : 0;
  const dailyTrend = usage?.by_day.slice(-9) ?? [];
  const trendMax = Math.max(...dailyTrend.map((item) => item.total_tokens), 1);
  const spark = dailyTrend.length > 0 ? dailyTrend.map((item) => item.total_tokens) : [4, 7, 5, 9, 6, 11, 8];
  const flowRanking = asRankingByFlow(usage);
  const modelRanking = asRankingByModel(usage);
  const topFlow = topBy(flowRanking);
  const topModel = topBy(modelRanking);

  return (
    <main className="page-stack">
      <section
        className="dashboard-hero"
        style={{ "--success-angle": `${successRate * 3.6}deg` } as CSSProperties}
      >
        <div className="dashboard-hero__copy">
          <span className="dashboard-hero__eyebrow">Painel operacional vivo</span>
          <Typography.Title level={1}>Centro de comando da API</Typography.Title>
          <Typography.Text className="dashboard-hero__lead">
            Acompanhe historico, consumo de tokens, custo persistido e saude dos fluxos em uma visao unica para decidir rapido.
          </Typography.Text>
          <div className="dashboard-hero__stats">
            <span className="hero-chip">
              <span className="hero-chip__label">Execucoes</span>
              <span className="hero-chip__value">{formatInteger(totalExecutions)}</span>
            </span>
            <span className="hero-chip">
              <span className="hero-chip__label">Custo total</span>
              <span className="hero-chip__value">{formatUsd(totals?.cost_total_usd)}</span>
            </span>
            <span className="hero-chip">
              <span className="hero-chip__label">Cache hit</span>
              <span className="hero-chip__value">{cacheRate}%</span>
            </span>
          </div>
        </div>

        <aside className="dashboard-hero__panel" aria-label="Saude operacional">
          <Space orientation="vertical" size={2}>
            <Typography.Text className="dashboard-hero__eyebrow">Saude operacional</Typography.Text>
            <Typography.Text className="dashboard-hero__lead">Sucesso consolidado da telemetria.</Typography.Text>
          </Space>
          <div className="hero-orbit">
            <div>
              <div className="hero-orbit__value">{successRate}%</div>
              <div className="hero-orbit__label">sucesso</div>
            </div>
          </div>
          <div className="hero-health-list">
            <span className="hero-health-item">
              Falhas no periodo <strong>{failureRate}%</strong>
            </span>
            <span className="hero-health-item">
              Custo por execucao <strong>{formatUsd(costPerExecution)}</strong>
            </span>
            <span className="hero-health-item">
              Fluxo mais pesado <strong>{topFlow?.name ?? "sem dados"}</strong>
            </span>
          </div>
        </aside>
      </section>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <section className="metric-grid" aria-label="KPIs de consumo">
        <MetricCard
          eyebrow="Volume"
          label="Execucoes"
          value={formatInteger(totalExecutions)}
          helper={`${formatInteger(totals?.successful)} sucesso / ${formatInteger(totals?.failed)} falhas`}
          accent={`${successRate}% taxa de sucesso`}
          spark={spark}
        />
        <MetricCard
          eyebrow="Consumo"
          label="Tokens"
          value={formatInteger(totals?.total_tokens)}
          helper={`${formatInteger(totals?.prompt_tokens)} entrada + ${formatInteger(totals?.completion_tokens)} saida`}
          accent={`${formatInteger(totals?.cache_read_tokens)} tokens lidos do cache`}
          tone="green"
          spark={spark.map((item, index) => item + index * 3)}
        />
        <MetricCard
          eyebrow="Financas"
          label="Custo total"
          value={formatUsd(totals?.cost_total_usd)}
          helper="USD persistido pelo provedor"
          accent={`${formatUsd(totals?.cost_input_usd)} input / ${formatUsd(totals?.cost_output_usd)} output`}
          tone="amber"
          spark={dailyTrend.length > 0 ? dailyTrend.map((item) => Math.max(item.cost_total_usd * 100000, 1)) : [2, 3, 4, 3, 6, 7, 5]}
        />
        <MetricCard
          eyebrow="Performance"
          label="Tempo medio"
          value={formatDuration(totals?.average_duration_ms)}
          helper={`${formatInteger(totals?.cache_hits)} cache hits`}
          accent={`${cacheRate}% das execucoes com cache`}
          tone="red"
          spark={spark.slice().reverse()}
        />
      </section>

      <section className="dashboard-grid">
        <Card className="glass-card trend-card" loading={loading}>
          <Space orientation="vertical" size={2}>
            <Typography.Text type="secondary">Ultimos dias</Typography.Text>
            <Typography.Title level={3}>Pulso de tokens</Typography.Title>
          </Space>
          {dailyTrend.length > 0 ? (
            <div className="trend-bars" aria-label="Tokens por dia">
              {dailyTrend.map((item) => (
                <div className="trend-bar" key={item.date} title={`${item.date}: ${formatInteger(item.total_tokens)} tokens`}>
                  <div className="trend-bar__track">
                    <div className="trend-bar__fill" style={{ height: `${chartHeight(item.total_tokens, trendMax)}%` }} />
                  </div>
                  <span className="trend-bar__label">{trendLabel(item.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-visual">Quando houver execucoes, o pulso diario aparece aqui.</div>
          )}
          <div className="insight-strip">
            <span className="insight-pill">
              <span>Modelo dominante</span>
              <strong>{topModel?.name ?? "sem dados"}</strong>
            </span>
            <span className="insight-pill">
              <span>Fluxo dominante</span>
              <strong>{topFlow?.name ?? "sem dados"}</strong>
            </span>
            <span className="insight-pill">
              <span>Falhas</span>
              <strong>{failureRate}% do periodo</strong>
            </span>
          </div>
        </Card>

        <Card className="glass-card ranking-card" loading={loading}>
          <Space orientation="vertical" size={2}>
            <Typography.Text type="secondary">Consumo acumulado</Typography.Text>
            <Typography.Title level={3}>Top modelos por tokens</Typography.Title>
          </Space>
          <RankingList items={modelRanking} />
        </Card>
      </section>

      <section className="dashboard-grid">
        <Card
          title="Consumo por fluxo"
          extra={<Tag color="green">tokens + custo</Tag>}
          loading={loading}
          className="glass-card split-table-card"
        >
          <Table
            rowKey="flow_type"
            size="small"
            pagination={false}
            dataSource={usage?.by_flow ?? []}
            className="dashboard-table"
            columns={[
              {
                title: "Fluxo",
                dataIndex: "flow_type",
                render: (value: string) => <span className="flow-name">{value}</span>,
              },
              { title: "Execucoes", dataIndex: "executions", render: formatInteger },
              { title: "Tokens", dataIndex: "total_tokens", render: formatInteger },
              { title: "Custo", dataIndex: "cost_total_usd", render: formatUsd },
            ]}
          />
        </Card>

        <Card
          title="Consumo por modelo"
          extra={<Tag color="cyan">roteamento</Tag>}
          loading={loading}
          className="glass-card split-table-card"
        >
          <Table
            rowKey="model"
            size="small"
            pagination={false}
            dataSource={usage?.by_model ?? []}
            className="dashboard-table"
            columns={[
              { title: "Modelo", dataIndex: "model" },
              { title: "Execucoes", dataIndex: "executions", render: formatInteger },
              { title: "Tokens", dataIndex: "total_tokens", render: formatInteger },
              { title: "Custo", dataIndex: "cost_total_usd", render: formatUsd },
            ]}
          />
        </Card>
      </section>
    </main>
  );
}
