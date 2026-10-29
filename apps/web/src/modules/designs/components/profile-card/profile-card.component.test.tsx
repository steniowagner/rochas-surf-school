import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileCard } from "./profile-card.component";

describe("ProfileCard", () => {
  it("draws a divider between its rows, not above the first", () => {
    render(<ProfileCard><p>one</p><p>two</p><p>three</p></ProfileCard>);

    const rows = screen.getAllByTestId("profile-card-row");
    expect(rows[0]).not.toHaveClass("border-t");
    expect(rows[1]).toHaveClass("border-t");
    expect(rows[2]).toHaveClass("border-t");
  });
});
