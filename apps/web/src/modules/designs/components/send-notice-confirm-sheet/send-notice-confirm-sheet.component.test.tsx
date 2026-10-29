import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SendNoticeConfirmSheet } from "./send-notice-confirm-sheet.component";

describe("SendNoticeConfirmSheet", () => {
  it("asks before sending, with who receives it and the preview of the notice", () => {
    render(<SendNoticeConfirmSheet locale="pt-br" description="Todos os alunos recebem uma notificação." count={42} title="Mudança de praia" message="Sábado a aula é na Praia do Futuro." />);

    expect(screen.getByRole("heading", { name: "Enviar a 42 pessoas?" })).toBeInTheDocument();
    expect(screen.getByText("Todos os alunos recebem uma notificação.")).toBeInTheDocument();
    expect(screen.getByTestId("notice-preview")).toHaveTextContent("Mudança de praiaSábado a aula é na Praia do Futuro.");
    expect(screen.getByRole("button", { name: "Sim, enviar" })).toHaveClass("bg-sun");
    expect(screen.getByRole("button", { name: "Voltar e editar" })).toBeInTheDocument();
  });

  it("says one person", () => {
    render(<SendNoticeConfirmSheet locale="pt-br" description="" count={1} title="" message="" />);

    expect(screen.getByRole("heading", { name: "Enviar a 1 pessoa?" })).toBeInTheDocument();
  });
});
