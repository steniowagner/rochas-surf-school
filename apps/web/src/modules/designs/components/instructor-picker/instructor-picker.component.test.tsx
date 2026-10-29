import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstructorPicker } from "./instructor-picker.component";

const teachers = [
  { id: "bruno", name: "Bruno Costa" },
  { id: "rafael", name: "Rafael Rocha" },
];

describe("InstructorPicker", () => {
  it("draws a row per teacher, the ticked ones on grape", () => {
    render(<InstructorPicker locale="pt-br" teachers={teachers} selectedIds={["rafael"]} />);

    expect(screen.getByRole("checkbox", { name: "Rafael Rocha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "Bruno Costa" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("img", { name: "Bruno Costa" })).toHaveTextContent("BC");
  });

  it("draws the spinner while the teachers load", () => {
    render(<InstructorPicker locale="pt-br" teachers={[]} selectedIds={[]} loading />);

    expect(screen.getByTestId("instructors-loading")).toBeInTheDocument();
  });

  it("draws the error with its retry button", () => {
    render(<InstructorPicker locale="pt-br" teachers={[]} selectedIds={[]} error />);

    expect(screen.getByText("Não foi possível carregar os instrutores.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
