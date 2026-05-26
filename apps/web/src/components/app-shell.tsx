"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, Layout, Menu, Space, Typography } from "antd";

const { Header, Content, Sider } = Layout;

const items = [
  { key: "/", label: <Link href="/">Dashboard</Link> },
  { key: "/history", label: <Link href="/history">Historico</Link> },
  { key: "/prompts", label: <Link href="/prompts">Prompts</Link> },
  { key: "/models", label: <Link href="/models">Modelos</Link> },
  { key: "/execute", label: <Link href="/execute">Executar fluxos</Link> },
  { key: "/status", label: <Link href="/status">Status/API Docs</Link> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const selected = pathname === "/" ? "/" : `/${pathname.split("/")[1]}`;

  return (
    <Layout className="app-shell">
      <Sider width={264} className="app-shell__sider" breakpoint="lg" collapsedWidth={0}>
        <div className="brand-block">
          <span className="brand-block__mark" aria-hidden="true">
            AI
          </span>
          <div>
            <Typography.Text className="brand-block__eyebrow">CPJ Cobranca</Typography.Text>
            <Typography.Title level={3}>AI Console</Typography.Title>
          </div>
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} className="app-shell__menu" />
        <div className="sider-status">
          <Typography.Text>Ambiente interno</Typography.Text>
          <Typography.Text className="sider-status__value">Sem login nesta versao</Typography.Text>
        </div>
      </Sider>
      <Layout className="app-shell__main">
        <Header className="app-shell__header">
          <div className="topbar">
            <Space orientation="vertical" size={0}>
              <Typography.Text className="topbar__eyebrow">Console tecnico</Typography.Text>
              <Typography.Text className="topbar__text">Operacao interna sem login - API base configuravel por ambiente</Typography.Text>
            </Space>
            <Badge status="processing" text="Painel online" />
          </div>
        </Header>
        <Content className="app-shell__content">{children}</Content>
      </Layout>
    </Layout>
  );
}
