import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonSheet } from "./person-sheet.component";

const props = { locale: "pt-br", name: "Rafael Rocha", role: "instructor" } as const;

describe("PersonSheet", () => {
  it("draws the person, the shared WhatsApp row and the close button, and no admin action", () => {
    render(<PersonSheet {...props} whatsapp="+55 85 99999 8888" />);

    expect(screen.getByRole("heading", { name: "Rafael Rocha" })).toBeInTheDocument();
    expect(screen.getByText("Instrutor")).toHaveClass("bg-info-tint");
    expect(screen.getByRole("button", { name: "Conversar por WhatsApp" })).toHaveTextContent("+55 85 99999 8888");
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.queryByText(/Remover/)).toBeNull();
  });

  it("says the number is not shared, in the muted row", () => {
    render(<PersonSheet {...props} whatsapp={null} />);

    expect(screen.getByText("Número não compartilhado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conversar por WhatsApp" })).toBeNull();
  });

  it("shows the e-mail row instead of WhatsApp when the app passes it", () => {
    render(<PersonSheet {...props} whatsapp={null} email="rafael@email.com" />);

    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("rafael@email.com")).toBeInTheDocument();
    expect(screen.queryByText("Número não compartilhado.")).toBeNull();
  });

  it("draws the admin's role actions and the instructor flag", () => {
    render(<PersonSheet {...props} role="admin" whatsapp={null} canChangeRole instructorFlag />);

    expect(screen.getByRole("checkbox", { name: "Também é instrutor" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Passar a instrutor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover da plataforma" })).toBeInTheDocument();
  });

  it("draws the role change's confirmation in place of the details, by the first name", () => {
    render(<PersonSheet {...props} name="Caio Sousa" role="student" whatsapp={null} canChangeRole step={{ roleAction: "promoteAdmin" }} />);

    expect(screen.getByRole("heading", { name: "Promover Caio a admin?" })).toBeInTheDocument();
    expect(screen.getByText("As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar" })).toBeNull();
  });

  it("draws the removal's confirmation", () => {
    render(<PersonSheet {...props} whatsapp={null} canChangeRole step="remove" />);

    expect(screen.getByRole("heading", { name: "Remover Rafael?" })).toBeInTheDocument();
  });
});
