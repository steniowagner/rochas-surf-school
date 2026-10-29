import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TermsLine } from "./terms-line.component";

describe("TermsLine", () => {
  it("draws the sentence with both links in the page language", () => {
    render(<TermsLine locale="en" />);

    expect(screen.getByRole("link", { name: "Terms of Use" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/By continuing/)).toHaveClass("text-ink-2");
  });

  it("takes the text color of the screen it sits on", () => {
    render(<TermsLine locale="pt-br" className="text-white/90" />);

    expect(screen.getByText(/Ao continuar/)).toHaveClass("text-white/90");
  });
});
