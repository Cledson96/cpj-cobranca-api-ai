import { describe, expect, it } from "vitest";
import { maskSensitiveData } from "@infrastructure/logging/logger";

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
