import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentAvatar } from "./student-avatar.component";

describe("StudentAvatar", () => {
  it("shows the initials of the first two names", () => {
    render(<StudentAvatar name="Ana Beatriz Lima" size={28} />);

    expect(screen.getByRole("img", { name: "Ana Beatriz Lima" })).toHaveTextContent("AB");
  });

  it("draws a ring when asked and the person icon for an erased account", () => {
    const { container } = render(<StudentAvatar name="Ex-aluno" size={28} ringed erased />);

    expect(screen.getByRole("img")).toHaveClass("border-surface");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("img")).not.toHaveTextContent("E");
  });
});
