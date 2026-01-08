import { describe, it, expect, afterEach, vi } from "vitest";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import { makeInitialPracticeState } from "@/lib/practice/defaults";
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
