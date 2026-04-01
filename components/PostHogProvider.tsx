"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { logger } from "@/lib/logger";
import { shouldIgnorePostHogExceptionEvent } from "@/lib/client-errors";
import PosthogTrackIdentity from "./PosthogTrackIdentity";
import { UtmTracker } from "./UtmTracker";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" || typeof window === "undefined") return;

    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey) {
      logger.warn("[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY");
      return;
    }

    posthog.init(apiKey, {
      api_host: "/ph",
      ui_host: "https://us.posthog.com",
      capture_pageview: true,
      capture_pageleave: false,
      autocapture: false,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      error_tracking: {
        captureExtensionExceptions: false,
      },
      disable_surveys: true,
      before_send: (captureResult) =>
        shouldIgnorePostHogExceptionEvent(captureResult) ? null : captureResult,
      loaded: (posthogInstance) => {
        (window as unknown as { posthog: typeof posthogInstance }).posthog = posthogInstance;
      },
    });

    return () => posthog.reset();
  }, []);

  return (
    <>
      <PosthogTrackIdentity />
      <UtmTracker />
      {children}
    </>
  );
}
