"use client";

import type { ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: "#1f6feb",
          colorSuccess: "#1f8f5f",
          colorWarning: "#b7791f",
          colorError: "#c24141",
          borderRadius: 14,
          fontFamily: "\"IBM Plex Sans\", \"Aptos\", \"Segoe UI\", sans-serif",
        },
        components: {
          Layout: {
            headerBg: "transparent",
            siderBg: "transparent",
            bodyBg: "transparent",
          },
          Card: {
            borderRadiusLG: 18,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
