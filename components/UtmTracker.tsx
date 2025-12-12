"use client";

import { useEffect } from "react";
import { track, register } from "@/lib/analytics";

/**
 * Client component that tracks UTM parameters and ref query params.
 * Runs on mount to capture traffic source information.
 */
export function UtmTracker() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("utm_source") || urlParams.get("ref");

    if (ref) {
      // Attach to the person (persistent)
      register({ traffic_source: ref });

      // Capture an event with the property
      track("landing_page_view", { traffic_source: ref });
    }
  }, []);

  // This component doesn't render anything
  return null;
}
