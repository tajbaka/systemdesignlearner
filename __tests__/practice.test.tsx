import { describe, it, expect, afterEach, vi } from "vitest";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import {
  makeDefaultDesignState,
  makeDefaultRunState,
  makeInitialPracticeState,
} from "@/lib/practice/defaults";
import { toMarkdown } from "@/lib/practice/brief";
import type { PracticeState } from "@/lib/practice/types";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("practice storage", () => {
  it("round-trips the new practice state structure", () => {
    const state: PracticeState = {
      ...makeInitialPracticeState(),
      completed: {
        functional: true,
        nonFunctional: true,
        api: true,
        sandbox: false,
        score: false,
      },
      updatedAt: Date.now(),
    };

    savePractice(state);
    const loaded = loadPractice("url-shortener");
    expect(loaded).toMatchObject({ completed: state.completed });
  });
});

describe("practice brief markdown", () => {
  it("includes requirements and simulation summary", async () => {
    const design = makeDefaultDesignState();
    const run = makeDefaultRunState();
    const state: PracticeState = {
      slug: "url-shortener",
      requirements: {
        functionalSummary: "Shorten URLs, redirect fast, allow optional analytics.",
        functional: {
          "create-short-url": true,
          "redirect-by-slug": true,
          "custom-alias": false,
          "basic-analytics": false,
          "rate-limiting": false,
          "admin-delete": false,
        },
        nonFunctional: {
          readRps: 5000,
          writeRps: 100,
          p95RedirectMs: 100,
          rateLimitNotes: "5 writes / min per IP",
          availability: "99.9",
          notes: "Prefer managed cache",
        },
      },
      design,
      run: {
        ...run,
        attempts: 1,
        lastResult: {
          latencyMsP95: 82,
          capacityRps: 5600,
          meetsLatency: true,
          meetsRps: true,
          backlogGrowthRps: 0,
          failedByChaos: false,
          acceptanceResults: {
            "cache-present": true,
            "lb-service": true,
          },
          acceptanceScore: 100,
          scoreBreakdown: {
            sloScore: 60,
            checklistScore: 30,
            costScore: 8,
            totalScore: 98,
            outcome: "pass",
            hints: ["Add CDN for global latency"],
          },
          completedAt: Date.now(),
        },
      },
      apiDefinition: makeInitialPracticeState().apiDefinition,
      auth: makeInitialPracticeState().auth,
      completed: {
        functional: true,
        nonFunctional: true,
        api: true,
        sandbox: true,
        score: true,
      },
      updatedAt: Date.now(),
    };

    const markdown = await toMarkdown(state);
    expect(markdown).toContain("Summary: Shorten URLs, redirect fast, allow optional analytics.");
    expect(markdown).toContain("Create short URLs: Enabled");
    expect(markdown).toContain("Read throughput target: 5,000 rps");
    expect(markdown).toContain("Rate limit notes: 5 writes / min per IP");
    expect(markdown).toContain("Outcome: pass");
    expect(markdown).toContain("P95 latency: 82 ms");
  });
});
