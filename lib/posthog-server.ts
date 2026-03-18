import { createHash } from "crypto";
import { PostHog } from "posthog-node";

// Server-side PostHog client (singleton)
let phClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!phClient) {
    phClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return phClient;
}

/**
 * Capture a server-side error as a $exception event in PostHog Error Tracking.
 * Uses $exception_list format required by the Error Tracking UI.
 * Fire-and-forget: does not throw, does not block the response.
 */
export function captureServerError(
  error: unknown,
  context?: Record<string, string | number | boolean | null>
) {
  const ph = getPostHogClient();
  if (!ph) return;

  const err = error instanceof Error ? error : new Error(String(error));

  const fingerprint = createHash("sha256").update(`${err.name}:${err.message}`).digest("hex");

  ph.capture({
    distinctId: "server",
    event: "$exception",
    properties: {
      $exception_type: err.name,
      $exception_message: err.message,
      $exception_stack_trace_raw: err.stack ?? "",
      $exception_fingerprint: fingerprint,
      $exception_list: [
        {
          type: err.name,
          value: err.message,
          mechanism: { handled: true, type: "generic", synthetic: false },
          stacktrace: { type: "raw", frames: [] },
        },
      ],
      $lib: "posthog-node",
      ...context,
    },
  });
}
