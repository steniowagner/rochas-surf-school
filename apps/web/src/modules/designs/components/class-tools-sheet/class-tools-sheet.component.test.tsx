import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassToolsSheet } from "./class-tools-sheet.component";

describe("ClassToolsSheet", () => {
  it("draws the four tools of a class with people, deleting disabled", () => {
    render(<ClassToolsSheet locale="pt-br" messageCount={6} deleteState="enrolled" />);

    expect(screen.getByRole("heading", { name: "Ferramentas da aula" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar aula" })).toBeEnabled();
    expect(screen.getByText("6 pessoas")).toBeInTheDocument();
    expect(screen.getByText("Avisa 6 pessoas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir aula" })).toBeDisabled();
    expect(screen.getByText("Tem inscritos")).toBeInTheDocument();
  });

  it("lets an empty class be deleted, with nobody to notify", () => {
    render(<ClassToolsSheet locale="pt-br" messageCount={0} deleteState="available" />);

    expect(screen.getByText("Ninguém ainda")).toBeInTheDocument();
    expect(screen.getByText("Ninguém para avisar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir aula" })).toBeEnabled();
    expect(screen.getByText("Ninguém inscrito")).toBeInTheDocument();
  });

  it("says a class that started can't be deleted", () => {
    render(<ClassToolsSheet locale="en" messageCount={1} deleteState="started" />);

    expect(screen.getByRole("button", { name: "Delete class" })).toBeDisabled();
    expect(screen.getByText("1 person")).toBeInTheDocument();
  });
});
