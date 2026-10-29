import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormSection } from "./form-section.component";

describe("FormSection", () => {
  it("draws the label, the hint and the content", () => {
    render(
      <FormSection label="Nível" hint="só informativo">
        <p>content</p>
      </FormSection>,
    );

    expect(screen.getByRole("heading", { name: "Nível" })).toBeInTheDocument();
    expect(screen.getByText("só informativo")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("draws the action link in grape", () => {
    render(
      <FormSection label="Local" actionLabel="Gerir">
        <p>content</p>
      </FormSection>,
    );

    expect(screen.getByRole("button", { name: "Gerir" })).toHaveClass("text-grape");
  });
});
