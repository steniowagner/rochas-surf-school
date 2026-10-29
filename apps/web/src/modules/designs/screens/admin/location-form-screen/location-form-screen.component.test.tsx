import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocationFormScreen } from "./location-form-screen.component";

describe("LocationFormScreen", () => {
  it("AD-04-07: a new place on the map drawn with tokens, the search, my location, and the panel before any point", () => {
    render(<LocationFormScreen locale="pt-br" state="new" />);

    expect(screen.getByTestId("location-map")).toBeInTheDocument();
    expect(screen.queryByTestId("location-map-pin")).toBeNull();
    expect(screen.getByText("Busque um endereço ou uma praia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minha localização" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novo local" })).toBeInTheDocument();
    expect(screen.getByText("Toque no mapa para marcar o ponto")).toBeInTheDocument();
    expect(screen.getByText("Ex.: Praia do Futuro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar local" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remover local" })).toBeNull();
  });

  it("AD-04-08: the pin, the address of the point and the name, ready to save", () => {
    render(<LocationFormScreen locale="pt-br" state="pointPicked" />);

    expect(screen.getByTestId("location-map-pin")).toBeInTheDocument();
    expect(screen.getByText("Ponto escolhido no mapa · -3.7190, -38.5020")).toBeInTheDocument();
    expect(screen.getByText("Barraca do Chico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar local" })).toBeEnabled();
  });

  it("AD-04-09: editing a place, with the notice to its classes and Remover local", () => {
    render(<LocationFormScreen locale="pt-br" state="edit" />);

    expect(screen.getByRole("heading", { name: "Editar local" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Avisar alunos e instrutores das próximas aulas?" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("6 aulas futuras usam este local.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remover local" })).toBeInTheDocument();
  });

  it("AD-04-10: a name another place has", () => {
    render(<LocationFormScreen locale="pt-br" state="duplicate" />);

    expect(screen.getByText("Já existe um local com este nome.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Salvar local" })).toBeDisabled();
  });

  it("AD-04-05: Remover local? over the edit, with the classes that keep it", () => {
    render(<LocationFormScreen locale="pt-br" state="archive" />);

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Remover local?" })).toBeInTheDocument();
    expect(within(sheet).getByText("As 6 aulas que já usam este local continuam como estão.")).toBeInTheDocument();
  });
});
