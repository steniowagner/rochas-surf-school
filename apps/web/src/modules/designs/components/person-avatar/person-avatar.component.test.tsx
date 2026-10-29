import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonAvatar } from "./person-avatar.component";

describe("PersonAvatar", () => {
  it("draws the first two initials in the medium circle", () => {
    render(<PersonAvatar name="Ana Beatriz Lima" />);

    expect(screen.getByRole("img", { name: "Ana Beatriz Lima" })).toHaveClass("size-10");
    expect(screen.getByText("AB")).toHaveClass("text-grape", "ds-text-list-title");
  });

  it("draws the large circle with the sheet title type", () => {
    render(<PersonAvatar name="Rafael" size="lg" />);

    expect(screen.getByRole("img")).toHaveClass("size-16");
    expect(screen.getByText("R")).toHaveClass("ds-text-sheet-title");
  });
});
