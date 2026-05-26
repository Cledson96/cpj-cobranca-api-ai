"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Descriptions, Space, Tag, Typography } from "antd";
import { getApiBaseUrl } from "@/lib/api-client";

export function StatusPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    let active = true;

    fetch(`${apiBaseUrl}/health`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha HTTP ${response.status}`);
        }
        return response.json() as Promise<{ status: string }>;
      })
      .then((body) => {
        if (active) {
          setStatus(body.status === "ok" ? "ok" : "error");
          setMessage(body.status);
        }
      })
      .catch((reason) => {
        if (active) {
          setStatus("error");
          setMessage(reason instanceof Error ? reason.message : "Falha ao consultar health check.");
        }
      });

    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  return (
    <main className="page-stack">
      <header className="page-heading">
        <Space orientation="vertical" size={4}>
          <Typography.Text type="secondary">Conectividade</Typography.Text>
          <Typography.Title level={1}>Status/API Docs</Typography.Title>
        </Space>
      </header>

      {status === "error" ? <Alert type="error" message={message} showIcon /> : null}

      <Card className="glass-card">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Health">
            {status === "ok" ? <Tag color="green">Operacional</Tag> : status === "loading" ? <Tag>Carregando</Tag> : <Tag color="red">Indisponivel</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="API Base">{apiBaseUrl}</Descriptions.Item>
          <Descriptions.Item label="Swagger">
            <a href={`${apiBaseUrl}/docs`} target="_blank" rel="noreferrer">
              Abrir Swagger
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="OpenAPI JSON">
            <a href={`${apiBaseUrl}/docs/json`} target="_blank" rel="noreferrer">
              Abrir especificacao
            </a>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </main>
  );
}
