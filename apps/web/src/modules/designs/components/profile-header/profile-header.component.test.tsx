import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileHeader } from "./profile-header.component";

describe("ProfileHeader", () => {
  it("draws the avatar, the name and the role chip", () => {
    render(<ProfileHeader locale="pt-br" name="Ana Beatriz Lima" role="student" />);

    expect(screen.getByRole("img", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
    expect(screen.getByText("Aluno")).toHaveClass("bg-info-tint");
  });
});
