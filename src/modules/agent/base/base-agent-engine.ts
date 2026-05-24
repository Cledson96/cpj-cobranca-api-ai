import type { AgentEngineResult } from "../models";
import { AgentEngineRunner } from "./agent-engine-runner";

export abstract class BaseAgentEngine<TInput, TOutput> {
  protected readonly runner: AgentEngineRunner;

  protected constructor(readonly name: string, runner: AgentEngineRunner = new AgentEngineRunner()) {
    this.runner = runner;
  }

  async execute(input: TInput): Promise<TOutput> {
    const result = await this.run(input);

    return result.output;
  }

  async run(input: TInput): Promise<AgentEngineResult<TOutput>> {
    return this.runner.run({
      engineName: this.name,
      input,
      operation: (operationInput) => this.invoke(operationInput),
    });
  }

  protected abstract invoke(input: TInput): Promise<TOutput>;
}
