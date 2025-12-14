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

    // Get URL params - handle double ampersands by normalizing the search string
    const searchString = window.location.search.replace(/&&+/g, "&");
    const urlParams = new URLSearchParams(searchString);

    // Standard UTM parameters
    const utmParams: Record<string, string> = {};
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

    utmKeys.forEach((key) => {
      const value = urlParams.get(key);
      if (value) {
        utmParams[key] = value;
      }
    });

    // Also check for legacy 'ref' parameter
    const ref = urlParams.get("ref");
    if (ref && !utmParams.utm_source) {
      utmParams.utm_source = ref;
      utmParams.traffic_source = ref; // Keep backward compatibility
    }

    // If we have any UTM parameters, track them
    if (Object.keys(utmParams).length > 0) {
      // Attach to the person (persistent) - store all UTM params
      register(utmParams);

      // Capture an event with all UTM properties
      track("landing_page_view", utmParams);
    }
  }, []);

  // This component doesn't render anything
  return null;
}
