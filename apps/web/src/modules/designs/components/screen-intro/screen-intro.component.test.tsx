import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScreenIntro } from "./screen-intro.component";

describe("ScreenIntro", () => {
  it("draws the icon tile, eyebrow, title and description", () => {
    render(<ScreenIntro icon={<i data-testid="icon" />} eyebrow="Último passo" title="Regras" description="Poucas e simples." />);

    expect(screen.getByTestId("icon").parentElement).toHaveClass("bg-sand", "rounded-card");
    expect(screen.getByText("Último passo")).toHaveClass("text-ink-2");
    expect(screen.getByRole("heading", { name: "Regras" })).toBeInTheDocument();
    expect(screen.getByText("Poucas e simples.")).toBeInTheDocument();
  });

  it("takes another tile and eyebrow color and omits a missing eyebrow", () => {
    const { rerender } = render(<ScreenIntro icon="i" eyebrow="Fechada" eyebrowClassName="text-bad" iconTileClassName="bg-bad-tint" title="T" description="D" />);
    expect(screen.getByText("Fechada")).toHaveClass("text-bad");

    rerender(<ScreenIntro icon="i" title="T" description="D" />);
    expect(screen.queryByText("Fechada")).toBeNull();
  });
});
