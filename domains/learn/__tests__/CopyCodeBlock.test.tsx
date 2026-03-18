import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopyCodeBlock } from "../components/CopyCodeBlock";

// Mock clipboard API
const writeText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText },
});

beforeEach(() => {
  writeText.mockClear();
});

describe("CopyCodeBlock", () => {
  it("renders a copy button", () => {
    render(
      <CopyCodeBlock>
        <code>const x = 1;</code>
      </CopyCodeBlock>
    );
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copies text content to clipboard on click", async () => {
    render(
      <CopyCodeBlock>
        <code>const x = 1;</code>
      </CopyCodeBlock>
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("const x = 1;");
    });
  });

  it("shows copied feedback after click", async () => {
    render(
      <CopyCodeBlock>
        <code>hello</code>
      </CopyCodeBlock>
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
  });
});
