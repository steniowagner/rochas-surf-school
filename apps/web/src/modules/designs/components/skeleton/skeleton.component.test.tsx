import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton.component";

describe("Skeleton", () => {
  it("is sand by default and takes the class that shapes it", () => {
    render(<Skeleton className="h-4 w-20 rounded-full" />);

    expect(screen.getByTestId("skeleton")).toHaveClass("bg-sand", "h-4", "w-20");
  });

  it("can be drawn on the surface tone", () => {
    render(<Skeleton tone="surface" />);

    expect(screen.getByTestId("skeleton")).toHaveClass("bg-surface");
  });
});
