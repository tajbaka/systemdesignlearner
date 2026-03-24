import { describe, expect, it } from "vitest";
import {
  isRecoverableAssetError,
  shouldIgnoreClientError,
  shouldIgnorePostHogExceptionEvent,
} from "@/lib/client-errors";

describe("client error filtering", () => {
  it("treats stale asset failures as recoverable", () => {
    expect(isRecoverableAssetError(new Error("ChunkLoadError: Loading chunk 42 failed"))).toBe(
      true
    );
    expect(isRecoverableAssetError(new Error("Failed to load clerk.browser.js"))).toBe(true);
  });

  it("ignores noisy client-side exceptions", () => {
    expect(shouldIgnoreClientError(new Error("NEXT_REDIRECT"))).toBe(true);
    expect(shouldIgnoreClientError(new Error("Unauthorized - please sign in"))).toBe(true);
    expect(shouldIgnoreClientError(new Error("Object Not Found Matching Id:123"))).toBe(true);
    expect(shouldIgnoreClientError(new Error("Something actionable happened"))).toBe(false);
  });

  it("drops matching PostHog exception events", () => {
    expect(
      shouldIgnorePostHogExceptionEvent({
        event: "$exception",
        properties: {
          $exception_types: ["ChunkLoadError"],
          $exception_values: ["Loading chunk 42 failed"],
        },
      })
    ).toBe(true);

    expect(
      shouldIgnorePostHogExceptionEvent({
        event: "$exception",
        properties: {
          $exception_types: ["Error"],
          $exception_values: ["Failed to fetch"],
        },
      })
    ).toBe(true);

    expect(
      shouldIgnorePostHogExceptionEvent({
        event: "$exception",
        properties: {
          $exception_types: ["Error"],
          $exception_values: ["Database write failed"],
        },
      })
    ).toBe(false);
  });
});
