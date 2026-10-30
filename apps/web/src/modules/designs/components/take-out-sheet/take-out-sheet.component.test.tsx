import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TakeOutSheet } from "./take-out-sheet.component";

const classSummary = { discipline: "surf", level: "beginner", dateLabel: "Quarta-feira · 9 set", timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;

describe("TakeOutSheet", () => {
  it("asks before taking a student out, with the class card and the optional reason", () => {
    render(<TakeOutSheet locale="pt-br" firstName="Caio" classSummary={classSummary} />);

    expect(screen.getByRole("heading", { name: "Retirar Caio da aula?" })).toBeInTheDocument();
    expect(screen.getByTestId("class-summary-card")).toHaveTextContent("08:00 – 09:30");
    expect(screen.getByText("A vaga fica livre. A pessoa recebe uma notificação, com o motivo se você escrever.")).toBeInTheDocument();
    expect(screen.getByText("Motivo (opcional)")).toBeInTheDocument();
    expect(screen.getByText("Ex.: Esta turma é de nível avançado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar da aula" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("has no icon on the confirm button and a ghost back button, for a student and for a trial guest", () => {
    const student = render(<TakeOutSheet locale="pt-br" firstName="Caio" classSummary={classSummary} />);

    expect(screen.getByRole("button", { name: "Retirar da aula" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("button", { name: "Voltar" })).not.toHaveClass("bg-dim");
    student.unmount();

    render(<TakeOutSheet locale="pt-br" trial firstName="Lucas Martins" classSummary={classSummary} />);

    expect(screen.getByRole("button", { name: "Retirar da aula" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("button", { name: "Voltar" })).not.toHaveClass("bg-dim");
  });

  it("only confirms for a trial guest, with no reason", () => {
    render(<TakeOutSheet locale="pt-br" trial firstName="Lucas Martins" classSummary={classSummary} />);

    expect(screen.getByRole("heading", { name: "Retirar Lucas Martins da aula?" })).toBeInTheDocument();
    expect(screen.getByTestId("class-summary-card")).toHaveTextContent("08:00 – 09:30");
    expect(screen.getByText("A vaga fica livre. É um aluno trial, sem conta — avise-o por WhatsApp.")).toBeInTheDocument();
    expect(screen.queryByText("Motivo (opcional)")).toBeNull();
  });
});
