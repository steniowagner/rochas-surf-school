import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRuleEditableRow } from "./school-rule-editable-row.component";

const rule = { title: "Chegue 15 minutos antes", description: "A aula começa na hora marcada." };

describe("SchoolRuleEditableRow", () => {
  it("draws the position, the rule and the two move buttons", () => {
    render(<SchoolRuleEditableRow locale="pt-br" rule={rule} position={2} showDivider moveUpDisabled={false} moveDownDisabled={false} />);

    expect(screen.getByText("02")).toHaveClass("text-sun");
    expect(screen.getByRole("button", { name: "Chegue 15 minutos antes" })).toHaveTextContent("A aula começa na hora marcada.");
    expect(screen.getByRole("button", { name: "Subir a regra 2" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Descer a regra 2" })).toBeEnabled();
  });

  it("disables the first rule's up and the last rule's down", () => {
    render(<SchoolRuleEditableRow locale="pt-br" rule={rule} position={1} showDivider={false} moveUpDisabled moveDownDisabled />);

    expect(screen.getByRole("button", { name: "Subir a regra 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descer a regra 1" })).toBeDisabled();
  });
});
