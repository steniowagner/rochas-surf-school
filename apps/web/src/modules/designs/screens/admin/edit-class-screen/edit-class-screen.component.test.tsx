import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditClassScreen } from "./edit-class-screen.component";

const notes = "Traga protetor solar.";

describe("EditClassScreen", () => {
  it("AD-04-11: the class's form with its values, the guests warning, who is told and the submit, in a tall frame", () => {
    render(<EditClassScreen locale="pt-br" state="edit" notes={notes} />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Editar aula" })).toBeInTheDocument();
    expect(screen.getByText("Qualquer dia a partir de hoje")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-09-09").firstElementChild?.firstElementChild).toHaveClass("bg-grape");
    expect(screen.queryByText("Toque em um dia para começar")).toBeNull();
    expect(screen.getByRole("button", { name: "08:00 – 09:30" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Horários sobrepostos não podem ir no mesmo lote.")).toBeNull();
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(notes)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Rafael Rocha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("guests-warning")).toBeInTheDocument();
    expect(screen.getByText("Ao salvar, avisamos os instrutores, 4 inscritos e 1 com pedido pendente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar e notificar" })).toBeDisabled();
  });

  it("AD-04-04: scrolled to the locations being managed, the class's removed place among them", () => {
    render(<EditClassScreen locale="pt-br" state="managingLocations" notes={notes} />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByRole("button", { name: "Concluir" })).toBeInTheDocument();
    expect(screen.getByText("Removido")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Praia do Cumbuco" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Novo local" })).toBeNull();
    expect(screen.queryByText("Modalidade")).toBeNull();
  });

  it("AD-04-12: a started class: only the instructors can change", () => {
    render(<EditClassScreen locale="pt-br" state="started" notes={notes} />);

    expect(screen.getByText("A aula já começou")).toBeInTheDocument();
    expect(screen.getByText("Só dá para trocar os instrutores.")).toBeInTheDocument();
    expect(screen.queryByText("Modalidade")).toBeNull();
    expect(screen.getByText("Instrutores")).toBeInTheDocument();
  });

  it("AD-04-13: the spinner while the class loads", () => {
    render(<EditClassScreen locale="pt-br" state="loading" notes={notes} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Instrutores")).toBeNull();
  });
});
