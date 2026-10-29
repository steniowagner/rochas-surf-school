import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassGuestRow } from "./class-guest-row.component";

describe("ClassGuestRow", () => {
  it("draws the guest's name with the trial chip", () => {
    render(<ClassGuestRow locale="pt-br" name="Lucas Martins" />);

    expect(screen.getByText("Lucas Martins")).toBeInTheDocument();
    expect(screen.getByText("Trial")).toHaveClass("bg-dim");
  });

  it("draws only the chip without a name", () => {
    const { container } = render(<ClassGuestRow locale="pt-br" name={null} />);

    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByText("Trial")).toBeInTheDocument();
  });

  it("draws the admin's take-out button, named after the guest or the chip", () => {
    const { rerender } = render(<ClassGuestRow locale="pt-br" name="Lucas Martins" takeOut />);

    expect(screen.getByRole("button", { name: "Retirar Lucas Martins" })).toHaveTextContent("Retirar");
    rerender(<ClassGuestRow locale="pt-br" name={null} takeOut />);
    expect(screen.getByRole("button", { name: "Retirar Trial" })).toBeInTheDocument();
  });
});
