const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function formatInteger(value: number | null | undefined): string {
  return integerFormatter.format(value ?? 0);
}

export function formatUsd(value: number | null | undefined): string {
  return `US$ ${(value ?? 0).toFixed(4)}`;
}

export function formatDuration(value: number | null | undefined): string {
  const duration = value ?? 0;
  if (duration < 1000) {
    return `${duration} ms`;
  }

  return `${(duration / 1000).toFixed(1)} s`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
