import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstructorPill } from "./instructor-pill.component";

describe("InstructorPill", () => {
  it("draws the instructor's avatar and name", () => {
    render(<InstructorPill name="Rafael Rocha" />);

    expect(screen.getByText("Rafael Rocha")).toBeInTheDocument();
    expect(screen.getByTestId("instructor-pill")).toHaveClass("border-line");
  });

  it("says you for the viewer, with the lagoon border", () => {
    render(<InstructorPill name="Rafael Rocha" viewerLabel="Você" />);

    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByTestId("instructor-pill")).toHaveClass("border-lagoon");
  });
});
