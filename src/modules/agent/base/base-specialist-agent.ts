import type { z } from "zod";
import { handleUnknownError } from "@/infrastructure/errors";
import {
  type AgentMessage,
  type StructuredOutputData,
  type StructuredOutputRunner,
} from "../llm";

export type BaseSpecialistAgentConfig<TOutput extends StructuredOutputData> = {
  name: string;
  outputSchema: z.ZodType<TOutput>;
  outputSchemaName: string;
  runner: StructuredOutputRunner;
};

export abstract class BaseSpecialistAgent<
  TOutput extends StructuredOutputData,
  TContext = unknown,
> {
  readonly name: string;
  private readonly outputSchema: z.ZodType<TOutput>;
  private readonly outputSchemaName: string;
  private readonly runner: StructuredOutputRunner;

  protected constructor(config: BaseSpecialistAgentConfig<TOutput>) {
    this.name = config.name;
    this.outputSchema = config.outputSchema;
    this.outputSchemaName = config.outputSchemaName;
    this.runner = config.runner;
  }

  async analyze(context: TContext): Promise<TOutput> {
    try {
      const messages: AgentMessage[] = [
        {
          role: "system",
          content: this.buildSystemPrompt(context),
        },
        {
          role: "user",
          content: this.buildUserPrompt(context),
        },
      ];

      return await this.runner.run({
        schema: this.outputSchema,
        schemaName: this.outputSchemaName,
        messages,
      });
    } catch (error) {
      throw handleUnknownError(error);
    }
  }

  protected abstract buildSystemPrompt(context: TContext): string;

  protected abstract buildUserPrompt(context: TContext): string;
}
