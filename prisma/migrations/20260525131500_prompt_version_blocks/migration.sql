CREATE TYPE "PromptBlockKey" AS ENUM ('agent', 'aggregator', 'naming_clarity', 'error_handling', 'resource_leak', 'complexity', 'security');

ALTER TABLE "PromptVersion"
ADD COLUMN "blockKey" "PromptBlockKey";

UPDATE "PromptVersion"
SET "blockKey" = 'agent'
WHERE "blockKey" IS NULL;

ALTER TABLE "PromptVersion"
ALTER COLUMN "blockKey" SET NOT NULL;

ALTER TABLE "PromptVersion"
DROP COLUMN "userPrompt";

DROP INDEX "PromptVersion_flowType_version_key";

CREATE INDEX "PromptVersion_flowType_version_idx" ON "PromptVersion"("flowType", "version");
CREATE UNIQUE INDEX "PromptVersion_flowType_version_blockKey_key" ON "PromptVersion"("flowType", "version", "blockKey");
