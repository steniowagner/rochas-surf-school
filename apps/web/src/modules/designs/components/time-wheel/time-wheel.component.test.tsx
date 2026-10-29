import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeWheel } from "./time-wheel.component";

describe("TimeWheel", () => {
  it("draws the chosen time on the band, with the rows around it faded and wrapping", () => {
    render(<TimeWheel label="Início" hour={23} minute={30} />);

    expect(screen.getByRole("group", { name: "Início 23:30" })).toBeInTheDocument();
    expect(screen.getByText("23")).toHaveClass("text-ink");
    expect(screen.getByText("01")).toHaveClass("opacity-30");
    expect(screen.getByText("28")).toHaveClass("opacity-30");
  });
});
