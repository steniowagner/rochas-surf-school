import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassStudentRow } from "./class-student-row.component";

describe("ClassStudentRow", () => {
  it("draws a student who opens their sheet, with the chevron", () => {
    const { container } = render(<ClassStudentRow name="Caio Sousa" />);

    expect(screen.getByRole("button", { name: "Caio Sousa" })).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("draws an erased student without the button", () => {
    render(<ClassStudentRow name="Ex-aluno" erased />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Ex-aluno")).toBeInTheDocument();
  });

  it("draws the admin's take-out button instead of the chevron", () => {
    const { container } = render(<ClassStudentRow name="Caio Sousa" takeOutLabel="Retirar" />);

    expect(screen.getByRole("button", { name: "Retirar Caio Sousa" })).toHaveTextContent("Retirar");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("gives an erased student no take-out button", () => {
    render(<ClassStudentRow name="Ex-aluno" erased takeOutLabel="Retirar" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
