"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { logger } from "@/lib/logger";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
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
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      debug: process.env.NODE_ENV === "development",
      loaded: (posthog) => {
        // Expose PostHog to window for analytics.ts to use
        window.posthog = posthog;
        if (process.env.NODE_ENV === "development") {
          logger.log("[PostHog] Initialized successfully");
        }
      },
    });

    return () => {
      // Cleanup on unmount
      posthog.reset();
    };
  }, []);

  return <>{children}</>;
}