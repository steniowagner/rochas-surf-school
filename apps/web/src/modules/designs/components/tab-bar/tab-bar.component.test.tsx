import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TabBar } from "./tab-bar.component";

const tabs = [
  { key: "a", label: "Agenda", icon: "Ionicons:calendar-outline" },
  { key: "b", label: "Reservas", icon: "Ionicons:ticket-outline" },
  { key: "c", label: "Escola", icon: "Feather:users" },
  { key: "d", label: "Perfil", icon: "FontAwesome6:circle-user" },
] as const;

describe("TabBar", () => {
  it("draws every tab with its label and marks the selected one in sun", () => {
    render(<TabBar tabs={[...tabs]} selected="b" />);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tab", { name: "Reservas" })).toHaveClass("text-sun");
    expect(screen.getByRole("tab", { name: "Reservas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveClass("text-ink-2");
  });

  it("puts the sun indicator over the selected tab", () => {
    render(<TabBar tabs={[...tabs]} selected="c" />);

    expect(screen.getByTestId("tab-indicator")).toHaveStyle({ width: "25%", transform: "translateX(200%)" });
  });

  it("falls back to the first tab for an unknown selection", () => {
    render(<TabBar tabs={[...tabs]} selected="zzz" />);

    expect(screen.getByTestId("tab-indicator")).toHaveStyle({ transform: "translateX(0%)" });
  });
});
