import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeRangeHint } from "./time-range-hint.component";

describe("TimeRangeHint", () => {
  it("draws the rule beside the info icon", () => {
    const { container } = render(<TimeRangeHint>Sugeridos a partir das aulas da semana passada.</TimeRangeHint>);

    expect(screen.getByText("Sugeridos a partir das aulas da semana passada.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
