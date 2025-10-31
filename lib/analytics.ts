"use client";

import type { PostHog } from "posthog-js";
import { logger } from "@/lib/logger";

const isClient = () => typeof window !== "undefined";

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

/**
 * Capture a product analytics event with PostHog.
 * All client components call this helper so we can swap implementations if needed.
 */
export const track = (event: string, properties: Record<string, unknown> = {}): void => {
  if (!isClient()) {
    return;
  }

  const client = window.posthog;
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      logger.warn("[analytics] PostHog not initialised yet – event dropped", event, properties);
    }
    return;
  }

  client.capture(event, properties);
};

/**
 * Convenience helper for inspecting recent events during development.
 * PostHog handles buffering internally, so we just expose the global queue if it exists.
 */
export const getDebugEvents = (): unknown[] => {
  if (!isClient()) {
    return [];
  }
  // @ts-expect-error – PostHog keeps a private event queue we can peek at in dev.
  return window.posthog?._queue ?? [];
};
