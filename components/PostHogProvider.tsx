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
      return;
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
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      capture_pageleave: true,
      autocapture: true,
      debug: false,
      loaded: (posthog) => {
        // Expose PostHog to window for analytics.ts to use
        window.posthog = posthog;
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
