import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassRuleRow } from "./class-rule-row.component";

describe("ClassRuleRow", () => {
  it("draws the title, the value and the chevron", () => {
    render(<ClassRuleRow icon="Ionicons:shield-outline" title="Regras da escola" value="3 regras" />);

    expect(screen.getByRole("button", { name: "Regras da escola" })).toBeInTheDocument();
    expect(screen.getByText("3 regras")).toHaveClass("text-ink");
    expect(document.querySelectorAll("svg")).toHaveLength(2);
  });

  it("leaves the value out when there is none", () => {
    render(<ClassRuleRow icon="Ionicons:shield-outline" title="Regras da escola" value={null} />);

    expect(screen.queryByText("3 regras")).toBeNull();
  });
});
