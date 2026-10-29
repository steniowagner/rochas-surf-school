import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeaderButton } from "./header-button.component";

describe("HeaderButton", () => {
  it("is just the icon, named by its label", () => {
    render(<HeaderButton icon="Ionicons:notifications-outline" label="Notificações" />);

    const button = screen.getByRole("button", { name: "Notificações" });
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button).not.toHaveClass("rounded-full");
    expect(screen.queryByTestId("header-button-badge")).toBeNull();
  });

  it("shows a badge for a positive count only", () => {
    const { rerender } = render(<HeaderButton icon="Ionicons:notifications-outline" label="N" badge={3} />);
    expect(screen.getByTestId("header-button-badge")).toHaveTextContent("3");

    rerender(<HeaderButton icon="Ionicons:notifications-outline" label="N" badge={0} />);
    expect(screen.queryByTestId("header-button-badge")).toBeNull();
  });

  it("draws the 44-point circle when standalone", () => {
    render(<HeaderButton icon="Ionicons:notifications-outline" label="N" badge={1} standalone />);

    expect(screen.getByRole("button")).toHaveClass("size-11", "rounded-full");
    expect(screen.getByTestId("header-button-badge")).toHaveClass("right-2");
  });
});
