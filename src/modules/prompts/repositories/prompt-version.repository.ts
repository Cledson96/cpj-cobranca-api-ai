import type { PrismaClient } from "@prisma/client";
import type { PromptVersionRepository } from "../services";
import type { PromptVersionIdentifier, PromptVersionListInput, PromptVersionRecord } from "../models";
import type { PromptVersionCreateRequest } from "@shared";

export class PrismaPromptVersionRepository implements PromptVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: PromptVersionListInput): Promise<PromptVersionRecord[]> {
    const rows = await this.prisma.promptVersion.findMany({
      where: { flowType: input.flow_type },
      orderBy: [{ version: "desc" }, { blockKey: "asc" }],
    });

    return groupPromptRows(rows);
  }

  async findActive(flowType: PromptVersionIdentifier["flow_type"]): Promise<PromptVersionRecord | null> {
    const rows = await this.prisma.promptVersion.findMany({
      where: { flowType, isActive: true },
      orderBy: [{ version: "desc" }, { blockKey: "asc" }],
    });

    return groupPromptRows(rows)[0] ?? null;
  }

  async findVersion(input: PromptVersionIdentifier): Promise<PromptVersionRecord | null> {
    const rows = await this.prisma.promptVersion.findMany({
      where: {
        flowType: input.flow_type,
        version: input.version,
      },
      orderBy: { blockKey: "asc" },
    });

    return groupPromptRows(rows)[0] ?? null;
  }

  async create(input: PromptVersionCreateRequest & { version: number }): Promise<PromptVersionRecord> {
    await this.prisma.$transaction(
      input.blocks.map((block) => this.prisma.promptVersion.create({
        data: {
          flowType: input.flow_type,
          version: input.version,
          name: input.name,
          blockKey: block.block_key,
          systemPrompt: block.system_prompt,
          isActive: false,
        },
      })),
    );

    const record = await this.findVersion({
      flow_type: input.flow_type,
      version: input.version,
    });

    if (!record) {
      throw new Error("Falha ao criar versao de prompt.");
    }

    return record;
  }

  async activate(input: PromptVersionIdentifier): Promise<PromptVersionRecord | null> {
    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({
        where: { flowType: input.flow_type },
        data: { isActive: false },
      }),
      this.prisma.promptVersion.updateMany({
        where: {
          flowType: input.flow_type,
          version: input.version,
        },
        data: { isActive: true },
      }),
    ]);

    return this.findVersion(input);
  }

  async getNextVersion(flowType: PromptVersionIdentifier["flow_type"]): Promise<number> {
    const result = await this.prisma.promptVersion.aggregate({
      where: { flowType },
      _max: { version: true },
    });

    return (result._max.version ?? 0) + 1;
  }
}

function groupPromptRows(
  rows: Array<{
    flowType: string;
    version: number;
    name: string;
    isActive: boolean;
    blockKey: string;
    systemPrompt: string;
  }>,
): PromptVersionRecord[] {
  const map = new Map<string, PromptVersionRecord>();

  for (const row of rows) {
    const key = `${row.flowType}:${row.version}`;
    const current = map.get(key) ?? {
      flow_type: row.flowType as PromptVersionRecord["flow_type"],
      version: row.version,
      name: row.name,
      is_active: row.isActive,
      blocks: [],
    };

    current.is_active = current.is_active || row.isActive;
    current.blocks.push({
      block_key: row.blockKey as PromptVersionRecord["blocks"][number]["block_key"],
      system_prompt: row.systemPrompt,
    });
    map.set(key, current);
  }

  return Array.from(map.values());
}
