import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PracticeFlow from "@/components/practice/PracticeFlow";
import * as storage from "@/lib/practice/storage";
import { makeInitialPracticeState } from "@/lib/practice/defaults";
import { toMarkdown } from "@/lib/practice/brief";
import type { PracticeState } from "@/lib/practice/types";
import LowLevelEditor from "@/components/practice/LowLevelEditor";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

const userState = makeInitialPracticeState();

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Practice flow", () => {
  it("advances steps only after clicking Continue", async () => {
    render(<PracticeFlow />);

    expect(await screen.findByText(/Functional scope/i)).toBeInTheDocument();
    expect(screen.queryByText(/Choose the architecture/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cards are keyboard focusable/i)).toBeInTheDocument();
    });
  });
});

describe("practice storage", () => {
  it("round-trips practice state through localStorage", () => {
    const state: PracticeState = {
      ...userState,
      locked: { req: true, high: false, low: false },
      updatedAt: Date.now(),
    };

    storage.savePractice(state);
    const loaded = storage.loadPractice("url-shortener");
    expect(loaded).toMatchObject({ locked: { req: true } });
  });
});

describe("practice brief", () => {
  it("contains availability and preset id", () => {
    const state: PracticeState = {
      slug: "url-shortener",
      requirements: {
        functional: {
          "create-short-url": true,
          "redirect-by-slug": true,
        },
        nonFunctional: {
          readRps: 5000,
          writeRps: 100,
          p95RedirectMs: 100,
          availability: "99.9",
        },
      },
      high: {
        presetId: "cache_primary",
        components: ["Web", "API", "Cache"],
      },
      low: makeInitialPracticeState().low,
      locked: { req: true, high: true, low: true },
      updatedAt: Date.now(),
    };

    const brief = toMarkdown(state);
    expect(brief).toContain("Availability: 99.9%");
    expect(brief).toContain("Preset: cache_primary");
  });
});

describe("capacity calculator", () => {
  it("displays derived DB reads around 250 per second", () => {
    const lowLevel = {
      ...(makeInitialPracticeState().low!),
      capacityAssumptions: {
        cacheHit: 95,
        avgWritesPerCreate: 1,
        readRps: 5000,
      },
    };

    render(
      <LowLevelEditor
        value={lowLevel}
        locked={false}
        onChange={() => {}}
        onContinue={() => {}}
      />
    );

    expect(screen.getByText(/Derived DB reads:/i).textContent).toMatch(/~250 /);
  });
});
