import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRuleRow } from "./school-rule-row.component";

const rule = { title: "Chegue cedo", description: "Dez minutos antes." };

describe("SchoolRuleRow", () => {
  it("numbers the rule with two digits and draws its texts", () => {
    render(<SchoolRuleRow rule={rule} position={3} showDivider={false} />);

    expect(screen.getByText("03")).toHaveClass("text-sun");
    expect(screen.getByText("Chegue cedo")).toBeInTheDocument();
    expect(screen.getByText("Dez minutos antes.")).toHaveClass("text-ink-2");
  });

  it("draws the divider only when asked", () => {
    const { container, rerender } = render(<SchoolRuleRow rule={rule} position={1} showDivider />);
    expect(container.firstElementChild).toHaveClass("border-b");

    rerender(<SchoolRuleRow rule={rule} position={1} showDivider={false} />);
    expect(container.firstElementChild).not.toHaveClass("border-b");
  });
});
