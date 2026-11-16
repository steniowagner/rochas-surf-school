import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeRangeHint } from "./time-range-hint.component";

describe("TimeRangeHint", () => {
  it("draws the rule beside the info icon", () => {
    const { container } = render(<TimeRangeHint>Sugeridos a partir das aulas desta semana e da passada.</TimeRangeHint>);

    expect(screen.getByText("Sugeridos a partir das aulas desta semana e da passada.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
