import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassDetailsSkeleton } from "./class-details-skeleton.component";

describe("ClassDetailsSkeleton", () => {
  it("draws a block for each element of the class details", () => {
    render(<ClassDetailsSkeleton />);

    expect(screen.getByTestId("class-details-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(16);
  });
});
