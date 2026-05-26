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
          colorPrimary: "#0f766e",
          colorSuccess: "#16a34a",
          colorWarning: "#d97706",
          colorError: "#e11d48",
          colorInfo: "#0284c7",
          borderRadius: 18,
          colorText: "#15202b",
          colorTextSecondary: "#65758b",
          colorBgContainer: "rgba(255, 255, 255, 0.86)",
          colorBorderSecondary: "rgba(21, 32, 43, 0.08)",
          fontFamily: "\"Space Grotesk\", \"IBM Plex Sans\", \"Aptos\", \"Segoe UI\", sans-serif",
        },
        components: {
          Layout: {
            headerBg: "transparent",
            siderBg: "transparent",
            bodyBg: "transparent",
          },
          Card: {
            borderRadiusLG: 24,
            boxShadowTertiary: "0 20px 60px rgba(15, 23, 42, 0.10)",
          },
          Table: {
            headerBg: "rgba(248, 250, 252, 0.72)",
            rowHoverBg: "rgba(20, 184, 166, 0.07)",
          },
          Menu: {
            itemBorderRadius: 18,
            itemHeight: 46,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
