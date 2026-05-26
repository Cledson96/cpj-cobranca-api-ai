import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff } from "@shared";

describe("retryWithBackoff", () => {
  it("repete operacao transitoria usando backoff exponencial", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let attempts = 0;

    const result = await retryWithBackoff({
      operation: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("falha temporaria");
        }

        return "ok";
      },
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep,
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it("preserva o erro final quando todas as tentativas falham", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const error = new Error("servico indisponivel");
    let attempts = 0;

    await expect(retryWithBackoff({
      operation: async () => {
        attempts += 1;
        throw error;
      },
      maxAttempts: 2,
      baseDelayMs: 50,
      sleep,
    })).rejects.toThrow(error);

    expect(attempts).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(50);
  });

  it("nao repete quando o predicado marca o erro como nao transitorio", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let attempts = 0;

    await expect(retryWithBackoff({
      operation: async () => {
        attempts += 1;
        throw new Error("payload invalido");
      },
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => false,
      sleep,
    })).rejects.toThrow("payload invalido");

    expect(attempts).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
