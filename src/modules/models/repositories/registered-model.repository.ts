import type { PrismaClient } from "@prisma/client";
import type { RegisteredModelRecord, UpdateModelInput } from "../models";
import type { ModelCreateRequest } from "@shared";
import type { ModelsRepository } from "../services";

export class PrismaRegisteredModelRepository implements ModelsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<RegisteredModelRecord[]> {
    const [models, settings] = await Promise.all([
      this.prisma.registeredModel.findMany({
        orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      }),
      this.prisma.globalModelSettings.findFirst(),
    ]);

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      is_active: model.isActive,
      is_default: settings?.defaultModelId === model.id,
    }));
  }

  async findById(id: string): Promise<RegisteredModelRecord | null> {
    const model = await this.prisma.registeredModel.findUnique({ where: { id } });
    if (!model) {
      return null;
    }

    const settings = await this.prisma.globalModelSettings.findFirst();
    return {
      id: model.id,
      name: model.name,
      is_active: model.isActive,
      is_default: settings?.defaultModelId === model.id,
    };
  }

  async findByName(name: string): Promise<RegisteredModelRecord | null> {
    const model = await this.prisma.registeredModel.findUnique({ where: { name } });
    if (!model) {
      return null;
    }

    const settings = await this.prisma.globalModelSettings.findFirst();
    return {
      id: model.id,
      name: model.name,
      is_active: model.isActive,
      is_default: settings?.defaultModelId === model.id,
    };
  }

  async findDefault(): Promise<RegisteredModelRecord | null> {
    const settings = await this.prisma.globalModelSettings.findFirst({
      include: { defaultModel: true },
    });

    if (!settings) {
      return null;
    }

    return {
      id: settings.defaultModel.id,
      name: settings.defaultModel.name,
      is_active: settings.defaultModel.isActive,
      is_default: true,
    };
  }

  async create(input: ModelCreateRequest): Promise<RegisteredModelRecord> {
    const model = await this.prisma.registeredModel.create({
      data: {
        name: input.name,
      },
    });

    return {
      id: model.id,
      name: model.name,
      is_active: model.isActive,
      is_default: false,
    };
  }

  async update(input: UpdateModelInput): Promise<RegisteredModelRecord> {
    const model = await this.prisma.registeredModel.update({
      where: { id: input.id },
      data: {
        name: input.name,
        isActive: input.is_active,
      },
    });
    const settings = await this.prisma.globalModelSettings.findFirst();

    return {
      id: model.id,
      name: model.name,
      is_active: model.isActive,
      is_default: settings?.defaultModelId === model.id,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.registeredModel.delete({ where: { id } });
  }

  async setDefault(id: string): Promise<RegisteredModelRecord> {
    await this.prisma.$transaction(async (tx) => {
      const existingSettings = await tx.globalModelSettings.findFirst();
      if (existingSettings) {
        await tx.globalModelSettings.update({
          where: { id: existingSettings.id },
          data: { defaultModelId: id },
        });
      } else {
        await tx.globalModelSettings.create({
          data: { defaultModelId: id },
        });
      }
    });

    const record = await this.findById(id);
    if (!record) {
      throw new Error("Falha ao configurar modelo padrao.");
    }

    return {
      ...record,
      is_default: true,
    };
  }
}
