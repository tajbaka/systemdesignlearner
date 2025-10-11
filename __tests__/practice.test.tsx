import { describe, it, expect, afterEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import {
  makeDefaultDesignState,
  makeDefaultRunState,
  makeInitialPracticeState,
} from "@/lib/practice/defaults";
import { toMarkdown } from "@/lib/practice/brief";
import type { PracticeState } from "@/lib/practice/types";
import PracticeFlow from "@/components/practice/PracticeFlow";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/components/practice/stages/DesignStage", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="design-stage">
      Design Stage
      <button type="button" onClick={props.onGoBack as () => void}>
        Back to Brief
      </button>
      <button type="button" onClick={props.onContinue as () => void}>
        Continue to Run
      </button>
    </div>
  ),
}));

vi.mock("@/components/practice/stages/RunStage", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="run-stage">
      Run Stage
      <button type="button" onClick={props.onGoBack as () => void}>
        Back to Design
      </button>
      <button type="button" onClick={props.onContinue as () => void}>
        Continue to Review
      </button>
    </div>
  ),
}));

vi.mock("@/components/practice/ReviewPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="review-panel">Review Panel</div>,
}));

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("practice storage", () => {
  it("round-trips the new practice state structure", () => {
    const state: PracticeState = {
      ...makeInitialPracticeState(),
      locked: { brief: true, design: true, run: false },
      updatedAt: Date.now(),
    };

    savePractice(state);
    const loaded = loadPractice("url-shortener");
    expect(loaded).toMatchObject({ locked: { brief: true, design: true, run: false } });
  });
});

describe("practice brief markdown", () => {
  it("includes requirements and simulation summary", () => {
    const design = makeDefaultDesignState();
    const run = makeDefaultRunState();
    const state: PracticeState = {
      slug: "url-shortener",
      requirements: {
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
          availability: "99.9",
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
          },
        },
      },
      locked: { brief: true, design: true, run: true },
      updatedAt: Date.now(),
    };

    const markdown = toMarkdown(state);
    expect(markdown).toContain("Create short URLs: Enabled");
    expect(markdown).toContain("Read throughput target: 5,000 rps");
    expect(markdown).toContain("Outcome: pass");
    expect(markdown).toContain("P95 latency: 82 ms");
  });
});

describe("PracticeFlow interactions", () => {
  it("advances from brief to design", () => {
    // jsdom does not implement smooth scroll; guard to prevent console noise
    const originalScrollTo = window.scrollTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = vi.fn();

    render(<PracticeFlow />);

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(screen.getByTestId("design-stage")).toBeInTheDocument();

    window.scrollTo = originalScrollTo;
  });

  it("allows returning to brief from design", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalScrollTo = window.scrollTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = vi.fn();

    render(<PracticeFlow />);

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByTestId("design-stage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to brief/i }));
    expect(screen.getByRole("heading", { name: /url shortener mvp/i })).toBeInTheDocument();
    window.scrollTo = originalScrollTo;
  });

  it("allows returning to design from run", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalScrollTo = window.scrollTo;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).scrollTo = vi.fn();

    render(<PracticeFlow />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue to run/i }));
    expect(screen.getByTestId("run-stage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to design/i }));
    expect(screen.getByTestId("design-stage")).toBeInTheDocument();
    window.scrollTo = originalScrollTo;
  });
});
