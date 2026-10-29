import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileAvatar } from "./profile-avatar.component";

describe("ProfileAvatar", () => {
  it("draws the initials in the 112 point circle without a camera button", () => {
    render(<ProfileAvatar name="Ana Beatriz Lima" />);

    expect(screen.getByRole("img", { name: "Ana Beatriz Lima" })).toHaveClass("size-28");
    expect(screen.getByText("AB")).toHaveClass("text-grape");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("adds the camera button when asked", () => {
    render(<ProfileAvatar name="Ana Beatriz Lima" changePhotoLabel="Mudar foto de perfil" />);

    expect(screen.getByRole("button", { name: "Mudar foto de perfil" })).toBeInTheDocument();
  });
});
