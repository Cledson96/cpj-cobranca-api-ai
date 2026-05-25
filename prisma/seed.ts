import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { CompliancePromptCatalog } from "../src/modules/compliance/prompts";
import { DocumentPromptCatalog } from "../src/modules/document/prompts";
import { defaultPullRequestReviewPrompts } from "../src/modules/prompts";
import { ReviewPromptCatalog } from "../src/modules/review/prompts";
import { TestsPromptCatalog } from "../src/modules/tests/prompts";

const prisma = new PrismaClient();
const DEFAULT_MODELS = [
  "openai/gpt-4o-mini",
  "deepseek/deepseek-v4-flash",
] as const;
const DEFAULT_GLOBAL_MODEL = "openai/gpt-4o-mini";

async function main() {
  await seedPromptVersions();
  await seedRegisteredModels();
}

async function seedPromptVersions() {
  const existingCount = await prisma.promptVersion.count();
  if (existingCount === 0) {
    const reviewTemplates = ReviewPromptCatalog.defaultTemplates();

    await prisma.promptVersion.createMany({
      data: [
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "naming_clarity",
          systemPrompt: reviewTemplates.specialists.naming_clarity,
          isActive: true,
        },
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "error_handling",
          systemPrompt: reviewTemplates.specialists.error_handling,
          isActive: true,
        },
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "resource_leak",
          systemPrompt: reviewTemplates.specialists.resource_leak,
          isActive: true,
        },
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "complexity",
          systemPrompt: reviewTemplates.specialists.complexity,
          isActive: true,
        },
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "security",
          systemPrompt: reviewTemplates.specialists.security,
          isActive: true,
        },
        {
          flowType: "review",
          version: 1,
          name: "Review v1",
          blockKey: "aggregator",
          systemPrompt: reviewTemplates.aggregator,
          isActive: true,
        },
        {
          flowType: "compliance",
          version: 1,
          name: "Compliance v1",
          blockKey: "agent",
          systemPrompt: CompliancePromptCatalog.defaultTemplate(),
          isActive: true,
        },
        {
          flowType: "document",
          version: 1,
          name: "Document v1",
          blockKey: "agent",
          systemPrompt: DocumentPromptCatalog.defaultTemplate(),
          isActive: true,
        },
        {
          flowType: "tests",
          version: 1,
          name: "Tests v1",
          blockKey: "agent",
          systemPrompt: TestsPromptCatalog.defaultTemplate(),
          isActive: true,
        },
      ],
    });
  }

  const existingPullRequestReviewCount = await prisma.promptVersion.count({
    where: { flowType: "pull_request_review" },
  });
  if (existingPullRequestReviewCount > 0) {
    return;
  }

  const pullRequestReviewPrompts = defaultPullRequestReviewPrompts();

  await prisma.promptVersion.createMany({
    data: [
      {
        flowType: "pull_request_review",
        version: 1,
        name: "Pull Request Review v1",
        blockKey: "code_standard",
        systemPrompt: pullRequestReviewPrompts.code_standard,
        isActive: true,
      },
      {
        flowType: "pull_request_review",
        version: 1,
        name: "Pull Request Review v1",
        blockKey: "jira_criteria",
        systemPrompt: pullRequestReviewPrompts.jira_criteria,
        isActive: true,
      },
      {
        flowType: "pull_request_review",
        version: 1,
        name: "Pull Request Review v1",
        blockKey: "project_consistency",
        systemPrompt: pullRequestReviewPrompts.project_consistency,
        isActive: true,
      },
      {
        flowType: "pull_request_review",
        version: 1,
        name: "Pull Request Review v1",
        blockKey: "security",
        systemPrompt: pullRequestReviewPrompts.security,
        isActive: true,
      },
      {
        flowType: "pull_request_review",
        version: 1,
        name: "Pull Request Review v1",
        blockKey: "aggregator",
        systemPrompt: pullRequestReviewPrompts.aggregator,
        isActive: true,
      },
    ],
  });
}

async function seedRegisteredModels() {
  for (const modelName of DEFAULT_MODELS) {
    await prisma.registeredModel.upsert({
      where: { name: modelName },
      update: {},
      create: { name: modelName, isActive: true },
    });
  }

  const defaultModel = await prisma.registeredModel.findUnique({
    where: { name: DEFAULT_GLOBAL_MODEL },
  });

  if (!defaultModel) {
    throw new Error("Modelo padrao inicial nao encontrado durante seed.");
  }

  const existingSettings = await prisma.globalModelSettings.findFirst();
  if (existingSettings) {
    await prisma.globalModelSettings.update({
      where: { id: existingSettings.id },
      data: { defaultModelId: defaultModel.id },
    });
    return;
  }

  await prisma.globalModelSettings.create({
    data: { defaultModelId: defaultModel.id },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
