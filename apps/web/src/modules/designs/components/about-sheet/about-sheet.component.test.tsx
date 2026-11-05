import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutSheet } from "./about-sheet.component";

describe("AboutSheet", () => {
  it("draws the app, the version, the description, the creator photo and the two links", () => {
    render(<AboutSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Rocha's Surf School" })).toBeInTheDocument();
    expect(screen.getByText("Versão 0.9 · beta")).toBeInTheDocument();
    expect(screen.getByText(/Toda semana os administradores postavam a agenda no grupo de WhatsApp/)).toBeInTheDocument();
    expect(screen.queryByText(/Projeto pessoal/)).toBeNull();
    expect(screen.getByText("Stenio Wagner")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Stenio Wagner" })).toBeInTheDocument();
    expect(screen.getByText("Design e desenvolvimento")).toBeInTheDocument();
    expect(screen.getAllByRole("button").slice(0, 2).map((link) => link.getAttribute("aria-label"))).toEqual(["Instagram do criador", "LinkedIn do criador"]);
    expect(screen.queryByText(/GitHub|Repositório/)).toBeNull();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});
