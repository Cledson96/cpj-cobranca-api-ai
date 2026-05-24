export type AgentEngineResult<TOutput> = {
  engineName: string;
  output: TOutput;
  durationMs: number;
};
