import { describe, expect, it } from "vitest";
import {
  createFastifyLoggerOptions,
  maskSensitiveData,
} from "@infrastructure/logging/logger";

describe("maskSensitiveData", () => {
  it("mascara chaves sensiveis em objetos aninhados", () => {
    const masked = maskSensitiveData({
      token: "abc",
      nested: {
        OPENROUTER_API_KEY: "secret",
        value: "public",
      },
      items: [{ authorization: "Bearer x" }],
    });

    expect(masked).toEqual({
      token: "***MASKED***",
      nested: {
        OPENROUTER_API_KEY: "***MASKED***",
        value: "public",
      },
      items: [{ authorization: "***MASKED***" }],
    });
  });
});

describe("createFastifyLoggerOptions", () => {
  it("usa logger colorido e timestamp legivel em desenvolvimento", () => {
    const options = createFastifyLoggerOptions({
      NODE_ENV: "development",
      LOG_LEVEL: "info",
    });

    expect(options).toEqual({
      level: "info",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          singleLine: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
        },
      },
    });
  });

  it("mantem json estruturado fora do desenvolvimento", () => {
    const options = createFastifyLoggerOptions({
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
    });

    expect(options).toEqual({
      level: "warn",
    });
  });
});
