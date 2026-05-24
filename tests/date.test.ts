import { describe, expect, it } from "vitest";
import { formatDateTimeSaoPaulo, nowSaoPauloIso } from "@shared";

describe("date utils", () => {
  it("formata data no horario de Sao Paulo/Brasilia", () => {
    expect(formatDateTimeSaoPaulo("2026-05-24T15:30:45.000Z")).toBe("24/05/2026 12:30:45");
  });

  it("gera timestamp ISO com offset de Sao Paulo", () => {
    expect(nowSaoPauloIso()).toMatch(/-03:00$/);
  });
});
