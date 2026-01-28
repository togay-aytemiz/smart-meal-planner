const DEFAULT_RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const DEFAULT_RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ENETUNREACH",
]);
const DEFAULT_RETRYABLE_MESSAGES = [
  "timeout",
  "timed out",
  "network",
  "socket",
  "fetch failed",
  "connection",
  "temporarily unavailable",
];

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number, maxAttempts: number) => void;
};

type RetryableErrorOptions = {
  statuses?: Set<number>;
  codes?: Set<string>;
  messageIncludes?: string[];
};

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const computeDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number, jitterRatio: number) => {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  const jitter = exponential * clamp(jitterRatio, 0, 1);
  const randomOffset = (Math.random() * 2 - 1) * jitter;
  return Math.max(0, Math.round(exponential + randomOffset));
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

const extractStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const maybeStatus =
    (error as { status?: number }).status ??
    (error as { statusCode?: number }).statusCode ??
    (error as { response?: { status?: number } }).response?.status ??
    (error as { cause?: { status?: number } }).cause?.status;

  return typeof maybeStatus === "number" ? maybeStatus : null;
};

const extractCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const maybeCode =
    (error as { code?: string }).code ??
    (error as { cause?: { code?: string } }).cause?.code ??
    (error as { error?: { code?: string } }).error?.code;

  return typeof maybeCode === "string" ? maybeCode : null;
};

export const isRetryableError = (error: unknown, options?: RetryableErrorOptions) => {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  const status = extractStatus(error);
  const codes = options?.codes ?? DEFAULT_RETRYABLE_CODES;
  const statuses = options?.statuses ?? DEFAULT_RETRYABLE_STATUSES;
  const messageIncludes = options?.messageIncludes ?? DEFAULT_RETRYABLE_MESSAGES;

  if (status !== null && statuses.has(status)) {
    return true;
  }

  const code = extractCode(error);
  if (code && codes.has(code)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return messageIncludes.some((snippet) => message.includes(snippet));
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  const maxAttempts = Math.max(1, options.maxAttempts);
  const shouldRetry = options.shouldRetry ?? (() => true);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      const delayMs = computeDelay(attempt, options.baseDelayMs, options.maxDelayMs, options.jitterRatio);
      options.onRetry?.(error, attempt, delayMs, maxAttempts);
      await sleep(delayMs);
    }
  }

  throw new Error("Retry attempts exhausted");
};
