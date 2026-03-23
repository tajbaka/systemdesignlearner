import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeadingLink } from "../components/HeadingLink";

describe("HeadingLink", () => {
  it("renders an anchor link with the correct href", () => {
    render(<HeadingLink id="test-section">Test Section</HeadingLink>);
    const link = screen.getByRole("link", { name: /link to.*test section/i });
    expect(link).toHaveAttribute("href", "#test-section");
  });

  it("renders children text", () => {
    render(<HeadingLink id="foo">Hello World</HeadingLink>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
