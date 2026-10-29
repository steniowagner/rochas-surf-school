import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnrolStudentScreen } from "./enrol-student-screen.component";

describe("EnrolStudentScreen", () => {
  it("AD-08-01: the who step on the school's students, the search and the list, Escolher aula disabled, in a tall frame", () => {
    render(<EnrolStudentScreen locale="pt-br" state="students" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Inscrever aluno" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Quem, Por escolher" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Aula, Por escolher" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tab", { name: "Aluno da escola" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Procurar aluno")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Escolher aula" })).toBeDisabled();
  });

  it("AD-08-02: a student chosen, the next step open", () => {
    render(<EnrolStudentScreen locale="pt-br" state="studentChosen" />);

    expect(screen.getByRole("radio", { name: "Caio Sousa" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("tab", { name: "Quem, Caio Sousa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher aula" })).toBeEnabled();
  });

  it("AD-08-03..04: a search with no match, and the students' skeleton", () => {
    const empty = render(<EnrolStudentScreen locale="pt-br" state="noStudents" />);
    expect(screen.getByText("Rodrigo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nenhum aluno encontrado" })).toBeInTheDocument();
    empty.unmount();

    render(<EnrolStudentScreen locale="pt-br" state="studentsLoading" />);
    expect(screen.getByRole("status", { name: "Carregando os alunos" })).toBeInTheDocument();
  });

  it("AD-08-05: a trial class's guest: the name, the WhatsApp and the note", () => {
    render(<EnrolStudentScreen locale="pt-br" state="trial" />);

    expect(screen.getByRole("tab", { name: "Aula experimental" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Ex.: Carolina Reis")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Esta aula não fica no histórico — se a pessoa criar conta depois, começa do zero.")).toBeInTheDocument();
  });

  it("AD-08-06: the class step: today's classes, the full one faded, the sport filter and Inscrever disabled", () => {
    render(<EnrolStudentScreen locale="pt-br" state="classes" />);

    expect(screen.getByRole("tab", { name: "Aula, Por escolher" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("calendar-day-2026-09-07")).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByTestId("enrol-class")).toHaveLength(3);
    expect(screen.getAllByTestId("enrol-class")[2]).toHaveClass("opacity-50");
    expect(screen.getByRole("button", { name: "Filtrar por modalidade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscrever" })).toBeDisabled();
  });

  it("AD-08-07..08: a day without classes, and the classes' skeletons", () => {
    const empty = render(<EnrolStudentScreen locale="pt-br" state="noClasses" />);
    expect(screen.getByTestId("calendar-day-2026-09-08")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Sem aulas neste dia" })).toBeInTheDocument();
    empty.unmount();

    render(<EnrolStudentScreen locale="pt-br" state="classesLoading" />);
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(2);
  });
});
