import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountStatus } from "./account-status.component";

const props = { icon: "MaterialCommunityIcons:close" as const, eyebrow: "Conta excluída", title: "Conta inativa", description: "Peça a reativação.", useAnotherEmailLabel: "Usar outro email" };

describe("AccountStatus", () => {
  it("draws the bad tone: tinted tile, red icon and eyebrow", () => {
    const { container } = render(<AccountStatus tone="bad" {...props} />);

    expect(screen.getByText("Conta excluída")).toHaveClass("text-bad");
    expect(container.querySelector("svg")).toHaveClass("text-bad");
    expect(container.querySelector(".bg-bad-tint")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Usar outro email" })).toHaveClass("text-ink");
  });

  it("draws the dim and sand tones", () => {
    const { container, rerender } = render(<AccountStatus tone="dim" {...props} />);
    expect(container.querySelector("svg")).toHaveClass("text-ink-2");
    expect(screen.getByText("Conta excluída")).toHaveClass("text-ink-2");

    rerender(<AccountStatus tone="sand" {...props} />);
    expect(container.querySelector("svg")).toHaveClass("text-grape");
  });

  it("draws the note and the primary action when given", () => {
    render(<AccountStatus tone="sand" {...props} note={{ title: "Como reativar", text: "Toque em Pedir." }} primaryAction={<button type="button">Pedir reativação</button>} />);

    expect(screen.getByText("Como reativar")).toBeInTheDocument();
    expect(screen.getByText("Toque em Pedir.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pedir reativação" })).toBeInTheDocument();
  });

  it("draws neither without them", () => {
    render(<AccountStatus tone="sand" {...props} />);

    expect(screen.queryByText("Como reativar")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
