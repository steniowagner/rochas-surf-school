import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChoiceRow } from "./choice-row.component";

describe("ChoiceRow", () => {
  it("draws the icon tile, the texts and the chevron", () => {
    const { container } = render(<ChoiceRow icon="Ionicons:log-in-outline" title="Tenho conta" description="Entre com o email." />);

    expect(screen.getByRole("button", { name: "Tenho conta" })).toBeInTheDocument();
    expect(screen.getByText("Entre com o email.")).toHaveClass("text-ink-2");
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.querySelector(".bg-sand svg")).toHaveClass("text-grape");
  });
});
