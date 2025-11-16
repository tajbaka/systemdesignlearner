import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  // Client-side Sentry initialization is handled by sentry.client.config.ts
  // which is automatically loaded by the Sentry Next.js SDK
}

export const onRequestError = Sentry.captureRequestError;
