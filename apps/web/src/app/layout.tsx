import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppShell } from "@/components/app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPJ Cobranca AI Console",
  description: "Painel interno para historico, prompts, modelos, custos e execucoes da API.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdRegistry>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
