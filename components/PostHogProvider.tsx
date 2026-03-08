"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { logger } from "@/lib/logger";
import PosthogTrackIdentity from "./PosthogTrackIdentity";
import { UtmTracker } from "./UtmTracker";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip PostHog initialization in development
    if (process.env.NODE_ENV === "development") {
      // return;
    }

    // Only initialize PostHog on the client side
    if (typeof window === "undefined") return;

    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey) {
      logger.warn("[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY");
      return;
    }

    // Initialize PostHog
    posthog.init(apiKey, {
      api_host: "/ph",
      ui_host: "https://us.posthog.com",
      capture_pageview: true,
      capture_pageleave: false,
      autocapture: false,
      disable_surveys: true, // Disable surveys to prevent script loading errors
      debug: (process.env.NODE_ENV as string) === "development",
      loaded: (posthogInstance) => {
        // Expose PostHog to window for analytics.ts to use
        (window as unknown as { posthog: typeof posthogInstance }).posthog = posthogInstance;
      },
    });

    return () => {
      // Cleanup on unmount
      posthog.reset();
    };
  }, []);

  return (
    <>
      <PosthogTrackIdentity />
      <UtmTracker />
      {children}
    </>
  );
}
