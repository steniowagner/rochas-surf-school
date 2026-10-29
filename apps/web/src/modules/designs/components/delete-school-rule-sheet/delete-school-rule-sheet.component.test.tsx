import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeleteSchoolRuleSheet } from "./delete-school-rule-sheet.component";

describe("DeleteSchoolRuleSheet", () => {
  it("asks before deleting the rule, with the note that everyone accepts again", () => {
    render(<DeleteSchoolRuleSheet locale="pt-br" title="Traga protetor solar" />);

    expect(screen.getByRole("heading", { name: "Excluir esta regra?" })).toBeInTheDocument();
    expect(screen.getByText("Traga protetor solar")).toBeInTheDocument();
    expect(screen.getByText(/todos vão precisar aceitar as regras de novo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir regra" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
