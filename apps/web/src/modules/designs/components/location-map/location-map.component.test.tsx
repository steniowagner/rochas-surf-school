import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationMap } from "./location-map.component";

describe("LocationMap", () => {
  it("draws the map with tokens, without a pin", () => {
    const { container } = render(<LocationMap />);

    expect(screen.getByTestId("location-map")).toHaveClass("bg-info-tint");
    expect(container.querySelector("img, iframe")).toBeNull();
    expect(screen.queryByTestId("location-map-pin")).toBeNull();
  });

  it("draws the pin of the picked point", () => {
    render(<LocationMap pin />);

    expect(screen.getByTestId("location-map-pin")).toBeInTheDocument();
  });
});
