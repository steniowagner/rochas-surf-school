import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeachingDayHeader } from "./teaching-day-header.component";

describe("TeachingDayHeader", () => {
  it("draws the day's name and its date as one heading", () => {
    render(<TeachingDayHeader label="Amanhã" date="8 set" />);

    expect(screen.getByRole("heading", { name: "Amanhã, 8 set" })).toBeInTheDocument();
    expect(screen.getByText("Amanhã")).toHaveClass("ds-text-section-label");
    expect(screen.getByText("8 set")).toHaveClass("ds-text-list-subtitle");
  });
});
