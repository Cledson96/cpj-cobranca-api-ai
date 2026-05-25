import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { CompliancePromptCatalog } from "../src/modules/compliance/prompts";
import { DocumentPromptCatalog } from "../src/modules/document/prompts";
import { ReviewPromptCatalog } from "../src/modules/review/prompts";
import { TestsPromptCatalog } from "../src/modules/tests/prompts";

const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.promptVersion.count();
  if (existingCount > 0) {
    return;
  }

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

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
