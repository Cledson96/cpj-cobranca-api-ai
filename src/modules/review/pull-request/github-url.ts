import { BadRequestError } from "@/infrastructure/errors";
import type { ParsedGitHubPullRequestUrl } from "./models";

export function parseGitHubPullRequestUrl(url: string): ParsedGitHubPullRequestUrl {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestError("URL de pull request invalida.");
  }

  const [, owner, repo, resource, number] = parsed.pathname.split("/");
  const pullRequestNumber = Number(number);

  if (
    parsed.hostname !== "github.com"
    || !owner
    || !repo
    || resource !== "pull"
    || !Number.isInteger(pullRequestNumber)
    || pullRequestNumber <= 0
  ) {
    throw new BadRequestError("URL de pull request invalida.");
  }

  return { owner, repo, number: pullRequestNumber };
}
