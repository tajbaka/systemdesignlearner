type PostHogCaptureResult = {
  event?: string;
  properties?: Record<string, unknown>;
} | null;

const RECOVERABLE_ASSET_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /CSS_CHUNK_LOAD_FAILED/i,
  /Loading chunk \d+ failed/i,
  /Failed to load clerk\.browser\.js/i,
  /Component spec missing/i,
  /Failed to load scenario reference/i,
];

const IGNORED_CLIENT_ERROR_PATTERNS = [
  ...RECOVERABLE_ASSET_ERROR_PATTERNS,
  /NEXT_REDIRECT/i,
  /Unauthorized - please sign in/i,
  /removeChild.+not a child/i,
  /insertBefore.+not a child/i,
  /Object Not Found Matching Id:\d+/i,
  /^Script error\.?$/i,
];

const IGNORED_POSTHOG_EXCEPTION_PATTERNS = [...IGNORED_CLIENT_ERROR_PATTERNS, /^Failed to fetch$/i];

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => asStringArray(item));
  }

  return [];
}

export function getClientErrorTexts(error: unknown): string[] {
  if (typeof error === "string") {
    return [error];
  }

  if (error instanceof Error) {
    return [error.name, error.message].filter(Boolean);
  }

  if (error && typeof error === "object") {
    const errorLike = error as {
      name?: unknown;
      message?: unknown;
      reason?: unknown;
      cause?: unknown;
    };

    return [
      ...asStringArray(errorLike.name),
      ...asStringArray(errorLike.message),
      ...asStringArray(errorLike.reason),
      ...asStringArray(errorLike.cause),
    ];
  }

  return [];
}

function matchesAnyPattern(values: string[], patterns: RegExp[]): boolean {
  return values.some((value) => patterns.some((pattern) => pattern.test(value)));
}

export function isRecoverableAssetError(error: unknown): boolean {
  return matchesAnyPattern(getClientErrorTexts(error), RECOVERABLE_ASSET_ERROR_PATTERNS);
}

export function shouldIgnoreClientError(error: unknown): boolean {
  return matchesAnyPattern(getClientErrorTexts(error), IGNORED_CLIENT_ERROR_PATTERNS);
}

export function shouldIgnorePostHogExceptionEvent(captureResult: PostHogCaptureResult): boolean {
  if (!captureResult || captureResult.event !== "$exception") {
    return false;
  }

  const properties = captureResult.properties ?? {};
  const errorTexts = [
    ...asStringArray(properties.$exception_types),
    ...asStringArray(properties.$exception_values),
  ];

  return matchesAnyPattern(errorTexts, IGNORED_POSTHOG_EXCEPTION_PATTERNS);
}
