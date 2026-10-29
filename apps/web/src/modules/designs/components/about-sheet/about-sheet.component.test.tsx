import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutSheet } from "./about-sheet.component";

describe("AboutSheet", () => {
  it("draws the app, the version, the description, the creator and the three links", () => {
    render(<AboutSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Rocha's Surf School" })).toBeInTheDocument();
    expect(screen.getByText("Versão 0.9 · beta")).toBeInTheDocument();
    expect(screen.getByText(/Projeto pessoal/)).toBeInTheDocument();
    expect(screen.getByText("Stenio Wagner")).toBeInTheDocument();
    expect(screen.getByText("Design e desenvolvimento")).toBeInTheDocument();
    expect(screen.getAllByRole("button").slice(0, 3).map((link) => link.getAttribute("aria-label"))).toEqual(["Repositório do app", "GitHub do criador", "LinkedIn do criador"]);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});
