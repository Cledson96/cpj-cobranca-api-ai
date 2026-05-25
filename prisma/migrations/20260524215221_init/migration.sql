-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('review', 'compliance', 'document', 'tests');

-- CreateEnum
CREATE TYPE "ExecutionFlowType" AS ENUM ('review', 'compliance', 'document', 'tests', 'batch');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "ExecutionStepKind" AS ENUM ('system', 'tool', 'prompt', 'llm', 'parser', 'persistence', 'webhook', 'cache');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "flowType" "ExecutionFlowType" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'pending',
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "requestHash" TEXT NOT NULL,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "sourceExecutionId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionTelemetry" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelRequested" TEXT NOT NULL,
    "modelUsed" TEXT,
    "openrouterGenerationId" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "costUsd" DECIMAL(12,8),
    "inputCostUsd" DECIMAL(12,8),
    "outputCostUsd" DECIMAL(12,8),
    "cacheReadTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nodeName" TEXT NOT NULL,
    "kind" "ExecutionStepKind" NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "inputPayload" JSONB,
    "outputPayload" JSONB,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "ExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "flowType" "FlowType" NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchExecution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BatchStatus" NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "BatchExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execution_createdAt_idx" ON "Execution"("createdAt");

-- CreateIndex
CREATE INDEX "Execution_flowType_status_idx" ON "Execution"("flowType", "status");

-- CreateIndex
CREATE INDEX "Execution_flowType_requestHash_status_idx" ON "Execution"("flowType", "requestHash", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionTelemetry_executionId_key" ON "ExecutionTelemetry"("executionId");

-- CreateIndex
CREATE INDEX "ExecutionStep_executionId_createdAt_idx" ON "ExecutionStep"("executionId", "createdAt");

-- CreateIndex
CREATE INDEX "PromptVersion_flowType_isActive_idx" ON "PromptVersion"("flowType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_flowType_version_key" ON "PromptVersion"("flowType", "version");

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_sourceExecutionId_fkey" FOREIGN KEY ("sourceExecutionId") REFERENCES "Execution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionTelemetry" ADD CONSTRAINT "ExecutionTelemetry_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStep" ADD CONSTRAINT "ExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
