import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TakeOutSheet } from "./take-out-sheet.component";

const summary = "Surf Iniciante · Quarta · 9 set, 08:00 – 09:30";

describe("TakeOutSheet", () => {
  it("asks before taking a student out, with the summary and the optional reason", () => {
    render(<TakeOutSheet locale="pt-br" firstName="Caio" summary={summary} />);

    expect(screen.getByRole("heading", { name: "Retirar Caio da aula?" })).toBeInTheDocument();
    expect(screen.getByText(`${summary}. A vaga fica livre. A pessoa recebe uma notificação, com o motivo se você escrever.`)).toBeInTheDocument();
    expect(screen.getByText("Motivo (opcional)")).toBeInTheDocument();
    expect(screen.getByText("Ex.: Esta turma é de nível avançado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar da aula" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("only confirms for a trial guest, with no reason", () => {
    render(<TakeOutSheet locale="pt-br" trial firstName="Lucas Martins" summary={summary} />);

    expect(screen.getByRole("heading", { name: "Retirar Lucas Martins da aula?" })).toBeInTheDocument();
    expect(screen.getByText(`${summary}. A vaga fica livre. É um aluno trial, sem conta — avise-o por WhatsApp.`)).toBeInTheDocument();
    expect(screen.queryByText("Motivo (opcional)")).toBeNull();
  });
});
