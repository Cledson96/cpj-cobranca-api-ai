export type LlmRunTelemetry = {
  provider: string;
  modelRequested: string;
  modelUsed?: string | null;
  generationId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  costUsd?: number | null;
  inputCostUsd?: number | null;
  outputCostUsd?: number | null;
  cacheReadTokens?: number | null;
};

export type AgentExecutionTelemetry = {
  provider: string;
  modelRequested: string;
  modelUsed: string | null;
  generationIds: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  cacheReadTokens: number | null;
};

export interface AgentExecutionTelemetrySink {
  record(input: LlmRunTelemetry): void;
}

export interface AgentExecutionTelemetrySource {
  snapshot(): AgentExecutionTelemetry | null;
}

export class AgentTelemetryCollector implements AgentExecutionTelemetrySink, AgentExecutionTelemetrySource {
  private readonly records: LlmRunTelemetry[] = [];

  record(input: LlmRunTelemetry): void {
    this.records.push(input);
  }

  snapshot(): AgentExecutionTelemetry | null {
    if (this.records.length === 0) {
      return null;
    }

    return {
      provider: this.firstValue((record) => record.provider) ?? "openrouter",
      modelRequested: this.firstValue((record) => record.modelRequested) ?? "",
      modelUsed: this.joinUniqueValues((record) => record.modelUsed),
      generationIds: this.uniqueValues((record) => record.generationId),
      promptTokens: this.sumNullable((record) => record.promptTokens),
      completionTokens: this.sumNullable((record) => record.completionTokens),
      totalTokens: this.sumNullable((record) => record.totalTokens),
      costUsd: this.sumMoney((record) => record.costUsd),
      inputCostUsd: this.sumMoney((record) => record.inputCostUsd),
      outputCostUsd: this.sumMoney((record) => record.outputCostUsd),
      cacheReadTokens: this.sumNullable((record) => record.cacheReadTokens),
    };
  }

  private firstValue(read: (record: LlmRunTelemetry) => string | null | undefined): string | null {
    for (const record of this.records) {
      const value = read(record);
      if (value) {
        return value;
      }
    }

    return null;
  }

  private uniqueValues(read: (record: LlmRunTelemetry) => string | null | undefined): string[] {
    const values = new Set<string>();
    for (const record of this.records) {
      const value = read(record);
      if (value) {
        values.add(value);
      }
    }

    return [...values];
  }

  private joinUniqueValues(read: (record: LlmRunTelemetry) => string | null | undefined): string | null {
    const values = this.uniqueValues(read);

    return values.length > 0 ? values.join(",") : null;
  }

  private sumNullable(read: (record: LlmRunTelemetry) => number | null | undefined): number | null {
    let total = 0;
    let hasValue = false;

    for (const record of this.records) {
      const value = read(record);
      if (typeof value === "number") {
        total += value;
        hasValue = true;
      }
    }

    return hasValue ? total : null;
  }

  private sumMoney(read: (record: LlmRunTelemetry) => number | null | undefined): number | null {
    const total = this.sumNullable(read);

    return total === null ? null : roundUsd(total);
  }
}

export function roundUsd(value: number): number {
  return Number(value.toFixed(8));
}
