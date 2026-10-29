import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemoveConfirmation } from "./remove-confirmation.component";

describe("RemoveConfirmation", () => {
  it("asks before removing a student, about the seats", () => {
    render(<RemoveConfirmation locale="pt-br" role="student" name="Caio" />);

    expect(screen.getByRole("heading", { name: "Remover Caio?" })).toBeInTheDocument();
    expect(screen.getByText(/As vagas que ocupava ficam livres/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover da plataforma" })).toHaveClass("bg-bad");
  });

  it("asks before removing staff, about the classes", () => {
    render(<RemoveConfirmation locale="pt-br" role="instructor" name="Marcos" />);

    expect(screen.getByText(/Sai das próximas aulas em que está atribuído/)).toBeInTheDocument();
  });
});
