export abstract class BaseFlowGraph<TInput, TOutput> {
  abstract invoke(input: TInput): Promise<TOutput>;
}
