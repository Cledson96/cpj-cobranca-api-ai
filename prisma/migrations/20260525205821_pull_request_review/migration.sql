-- AlterEnum
ALTER TYPE "ExecutionFlowType" ADD VALUE 'pull_request_review';

-- AlterEnum
ALTER TYPE "FlowType" ADD VALUE 'pull_request_review';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PromptBlockKey" ADD VALUE 'code_standard';
ALTER TYPE "PromptBlockKey" ADD VALUE 'jira_criteria';
ALTER TYPE "PromptBlockKey" ADD VALUE 'project_consistency';
