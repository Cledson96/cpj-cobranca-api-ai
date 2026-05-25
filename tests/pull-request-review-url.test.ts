import { describe, expect, it } from "vitest";
import { parseGitHubPullRequestUrl } from "@/modules/review/pull-request";

describe("parseGitHubPullRequestUrl", () => {
  it("extrai owner, repo e numero do PR", () => {
    expect(parseGitHubPullRequestUrl("https://github.com/acme/app/pull/42")).toEqual({
      owner: "acme",
      repo: "app",
      number: 42,
    });
  });

  it("rejeita URL que nao e pull request do GitHub", () => {
    expect(() => parseGitHubPullRequestUrl("https://github.com/acme/app/issues/42")).toThrow("URL de pull request invalida");
  });
});
