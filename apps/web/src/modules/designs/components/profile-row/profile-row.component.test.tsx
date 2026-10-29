import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileRow } from "./profile-row.component";

describe("ProfileRow", () => {
  it("draws the icon, the label, the value and the chevron of a pressable row", () => {
    render(<ProfileRow icon="Ionicons:logo-whatsapp" label="WhatsApp" value="Visível" />);

    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByText("Visível")).toHaveClass("text-ink-2");
    expect(document.querySelectorAll("svg")).toHaveLength(2);
    expect(document.querySelector("svg")).toHaveClass("text-lagoon");
  });

  it("draws a control in place of the value and the chevron", () => {
    render(<ProfileRow icon="Ionicons:notifications-outline" label="Push" value="x" trailing={<span data-testid="control" />} />);

    expect(screen.getByTestId("control")).toBeInTheDocument();
    expect(screen.queryByText("x")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelectorAll("svg")).toHaveLength(1);
  });

  it("hides the chevron and tints a destructive row in bad", () => {
    render(<ProfileRow icon="Ionicons:trash-outline" label="Remover a conta" hideChevron destructive />);

    expect(screen.getByText("Remover a conta")).toHaveClass("text-bad");
    expect(document.querySelector("svg")).toHaveClass("text-bad");
    expect(document.querySelectorAll("svg")).toHaveLength(1);
  });

  it("is not a button when it opens nothing", () => {
    render(<ProfileRow icon="Ionicons:mail-outline" label="E-mail" pressable={false} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelectorAll("svg")).toHaveLength(1);
  });
});
