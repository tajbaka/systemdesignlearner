"use client";

import type { PostHog } from "posthog-js";

const isClient = () => typeof window !== "undefined";

/**
 * Get the current environment (development, production, etc.)
 */
const getEnvironment = (): string => {
  return process.env.NODE_ENV || "development";
};

/**
 * Attach basic properties (like environment) to any properties object.
 * This ensures consistent metadata across all analytics calls.
 */
const withBasicProperties = (properties?: Record<string, unknown>): Record<string, unknown> => {
  return {
    ...properties,
    environment: getEnvironment(),
  };
};

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
  // Skip tracking in development
  if (process.env.NODE_ENV === "development") {
    // return;
  }

  if (!isClient()) {
    return;
  }

  const client = window.posthog;
  if (!client) {
    return;
  }

  client.capture(event, withBasicProperties(properties));
};

/**
 * Identify a user in PostHog.
 * Call this when a user authenticates to link events to their user profile.
 */
export const identify = (userId: string, properties?: Record<string, unknown>): void => {
  // Skip tracking in development
  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!isClient()) {
    return;
  }

  const client = window.posthog;
  if (!client) {
    return;
  }

  client.identify(userId, withBasicProperties(properties));
};

/**
 * Register person properties in PostHog.
 * These properties are attached to the person profile and persist across sessions.
 */
export const register = (properties: Record<string, unknown>): void => {
  // Skip tracking in development
  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!isClient()) {
    return;
  }

  const client = window.posthog;
  if (!client) {
    return;
  }

  client.register(withBasicProperties(properties));
};

/**
 * Identify a user as part of a group in PostHog.
 * Groups allow you to analyze users by organization, plan, or other shared attributes.
 */
export const group = (
  groupType: string,
  groupKey: string,
  properties?: Record<string, unknown>
): void => {
  // Skip tracking in development
  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (!isClient()) {
    return;
  }

  const client = window.posthog;
  if (!client) {
    return;
  }

  client.group(groupType, groupKey, withBasicProperties(properties));
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
