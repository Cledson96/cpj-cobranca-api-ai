-- CreateTable
CREATE TABLE "RegisteredModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisteredModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalModelSettings" (
    "id" TEXT NOT NULL,
    "defaultModelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalModelSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredModel_name_key" ON "RegisteredModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalModelSettings_defaultModelId_key" ON "GlobalModelSettings"("defaultModelId");

-- AddForeignKey
ALTER TABLE "GlobalModelSettings" ADD CONSTRAINT "GlobalModelSettings_defaultModelId_fkey" FOREIGN KEY ("defaultModelId") REFERENCES "RegisteredModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
