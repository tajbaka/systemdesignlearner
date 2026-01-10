import { describe, it, expect, afterEach, vi } from "vitest";
import { loadPractice, savePractice } from "@/domains/practice/lib/storage";
import { makeInitialPracticeState } from "@/domains/practice/lib/defaults";
import type { PracticeState } from "@/domains/practice/types";

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
