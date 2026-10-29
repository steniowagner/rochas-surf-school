import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassCardSkeleton } from "./class-card-skeleton.component";

describe("ClassCardSkeleton", () => {
  it("draws the placeholder blocks of a card", () => {
    render(<ClassCardSkeleton />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByTestId("class-card-skeleton")).toHaveClass("rounded-card");
  });
});
