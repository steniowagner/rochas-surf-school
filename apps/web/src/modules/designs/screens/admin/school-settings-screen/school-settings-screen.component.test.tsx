import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolSettingsScreen } from "./school-settings-screen.component";

describe("SchoolSettingsScreen", () => {
  it("AD-10-01: the intro, the waiting list on, the school's WhatsApp and Save", () => {
    render(<SchoolSettingsScreen locale="pt-br" state="ready" />);

    expect(screen.getByRole("heading", { name: "Configurações da escola" })).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Numa aula cheia, os alunos podem entrar na lista de espera/)).toBeInTheDocument();
    expect(screen.getByText("É o número do botão «Falar com a escola».")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("AD-10-02: the waiting list turned off, ready to save", () => {
    render(<SchoolSettingsScreen locale="pt-br" state="waitingListOff" />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Desligada — numa aula cheia/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("AD-10-03..04: the skeleton and the load error, the title in the header", () => {
    const loading = render(<SchoolSettingsScreen locale="pt-br" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando as configurações" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configurações da escola" })).toBeInTheDocument();
    loading.unmount();

    render(<SchoolSettingsScreen locale="pt-br" state="error" />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar as configurações" })).toBeInTheDocument();
  });
});
