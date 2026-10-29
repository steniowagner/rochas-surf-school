import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GuestAvatar } from "./guest-avatar.component";

describe("GuestAvatar", () => {
  it("draws the person icon on sand, ringed when asked", () => {
    const { rerender } = render(<GuestAvatar locale="pt-br" size={30} />);

    expect(screen.getByRole("img", { name: "Trial" })).toHaveStyle({ width: "30px" });
    expect(screen.getByRole("img", { name: "Trial" })).not.toHaveClass("border-2");
    rerender(<GuestAvatar locale="pt-br" size={30} ringed />);
    expect(screen.getByRole("img", { name: "Trial" })).toHaveClass("border-2", "border-surface");
  });
});
