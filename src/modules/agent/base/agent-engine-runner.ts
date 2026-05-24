import dayjs from "dayjs";
import { handleUnknownError } from "@/infrastructure/errors";
import type { AgentEngineResult } from "../models";

export type AgentEngineRunnerInput<TInput, TOutput> = {
  engineName: string;
  input: TInput;
  operation: (input: TInput) => Promise<TOutput>;
};

export class AgentEngineRunner {
  async run<TInput, TOutput>(
    input: AgentEngineRunnerInput<TInput, TOutput>,
  ): Promise<AgentEngineResult<TOutput>> {
    const startedAt = dayjs().valueOf();

    try {
      const output = await input.operation(input.input);

      return {
        engineName: input.engineName,
        output,
        durationMs: dayjs().valueOf() - startedAt,
      };
    } catch (error) {
      throw handleUnknownError(error);
    }
  }
}
