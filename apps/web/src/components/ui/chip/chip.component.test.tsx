import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip.component";

describe("Chip", () => {
  it("renders its label with the info tone by default", () => {
    render(<Chip>Beginner</Chip>);

    expect(screen.getByText("Beginner")).toHaveClass("bg-info-tint");
  });

  it("applies the class of the chosen tone", () => {
    render(<Chip tone="ok">Paid</Chip>);

    expect(screen.getByText("Paid")).toHaveClass("bg-ok-tint");
  });
});
