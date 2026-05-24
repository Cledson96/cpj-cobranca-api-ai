import { ChatOpenRouter } from "@langchain/openrouter";
import type { z } from "zod";
import { GenericError, handleUnknownError } from "@/infrastructure/errors";

export type StructuredOutputData = Record<string, unknown>;

export type AgentMessageRole = "system" | "user" | "assistant";

export type AgentMessage = {
  role: AgentMessageRole;
  content: string;
};

export type StructuredOutputRunnerInput<TOutput extends StructuredOutputData> = {
  schema: z.ZodType<TOutput>;
  schemaName: string;
  messages: AgentMessage[];
};

export interface StructuredOutputRunner {
  run<TOutput extends StructuredOutputData>(input: StructuredOutputRunnerInput<TOutput>): Promise<TOutput>;
}

export class LangChainStructuredOutputRunner implements StructuredOutputRunner {
  constructor(private readonly chatModel: ChatOpenRouter) {}

  async run<TOutput extends StructuredOutputData>(
    input: StructuredOutputRunnerInput<TOutput>,
  ): Promise<TOutput> {
    try {
      const structuredModel = this.chatModel.withStructuredOutput(input.schema, {
        method: "jsonSchema",
        name: input.schemaName,
        strict: true,
      });
      const output = await structuredModel.invoke(input.messages);
      const parsed = input.schema.safeParse(output);

      if (!parsed.success) {
        throw new GenericError(`Saida estruturada invalida para ${input.schemaName}.`, parsed.error);
      }

      return parsed.data;
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
