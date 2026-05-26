export type RetrySleep = (delayMs: number) => Promise<void>;

export type RetryWithBackoffInput<T> = {
  operation: () => Promise<T>;
  maxAttempts: number;
  baseDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: RetrySleep;
};

export type HttpResponseLike = {
  status: number;
};

export class RetryableHttpResponseError<TResponse extends HttpResponseLike> extends Error {
  constructor(readonly response: TResponse) {
    super(`HTTP transitorio ${response.status}`);
  }
}

export async function retryWithBackoff<T>(input: RetryWithBackoffInput<T>): Promise<T> {
  const maxAttempts = Math.max(1, input.maxAttempts);
  const baseDelayMs = Math.max(0, input.baseDelayMs);
  const shouldRetry = input.shouldRetry ?? (() => true);
  const sleep = input.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await input.operation();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export async function retryHttpOperation<TResponse extends HttpResponseLike>(input: {
  operation: () => Promise<TResponse>;
  maxAttempts: number;
  baseDelayMs: number;
}): Promise<TResponse> {
  try {
    return await retryWithBackoff({
      operation: async () => {
        const response = await input.operation();
        if (isTransientHttpStatus(response.status)) {
          throw new RetryableHttpResponseError(response);
        }

        return response;
      },
      maxAttempts: input.maxAttempts,
      baseDelayMs: input.baseDelayMs,
      shouldRetry: (error) => error instanceof RetryableHttpResponseError,
    });
  } catch (error) {
    if (error instanceof RetryableHttpResponseError) {
      return error.response as TResponse;
    }

    throw error;
  }
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
