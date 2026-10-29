import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileScreen } from "./profile-screen.component";

const rules = { surf: "Cancele até 24 horas antes.", skate: "Cancele até 12 horas antes." };
const open = (state: Parameters<typeof ProfileScreen>[0]["state"]) => render(<ProfileScreen locale="pt-br" state={state} rules={rules} />);

describe("ProfileScreen", () => {
  it("ST-05-01: every row of the profile, with Remover a conta below the fold and the tab bar at the bottom of a tall frame", () => {
    open("profile");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
    expect(screen.getByText("Aluno")).toBeInTheDocument();
    for (const label of ["Editar perfil", "WhatsApp", "Tema", "Idioma", "Regras da escola", "Regras de cancelamento", "Sobre o app", "Política de privacidade", "Termos de uso", "Sair", "Remover a conta"]) {
      expect(screen.getByText(label), label).toBeInTheDocument();
    }
    expect(screen.getByText("Visível")).toBeInTheDocument();
    expect(screen.getByText("Português")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Notificações push" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Os avisos ficam sempre no app/)).toBeInTheDocument();
    const frame = screen.getByTestId("phone-frame");
    const position = (node: Node) => [...frame.querySelectorAll("*")].indexOf(node as Element);
    expect(position(screen.getByText("Remover a conta"))).toBeLessThan(position(screen.getByRole("tablist")));
  });

  it("ST-05-02: the push switch off with the toast", () => {
    open("pushDenied");

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("alert")).toHaveTextContent("Permita as notificações do app nos ajustes do celular.");
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
  });

  it("ST-05-03, 04: the language and theme sheets", () => {
    const language = open("languageSheet");
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /Português/ })).toHaveAttribute("aria-pressed", "true");
    language.unmount();

    open("themeSheet");
    expect(within(screen.getByRole("dialog")).getAllByRole("button")).toHaveLength(3);
  });

  it("ST-05-05..08: about, sign-out and remove account sheets", () => {
    const about = open("aboutSheet");
    expect(screen.getByText("Versão 0.9 · beta")).toBeInTheDocument();
    about.unmount();

    const signOut = open("signOutSheet");
    expect(screen.getByRole("heading", { name: "Sair da conta?" })).toBeInTheDocument();
    signOut.unmount();

    const remove = open("deleteSheet");
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Remover a conta" })).toBeInTheDocument();
    remove.unmount();

    open("removing");
    expect(screen.getByRole("status", { name: "Remover a conta" })).toBeInTheDocument();
  });

  it("ST-05-09..12: the cancellation rules sheet and its states", () => {
    const ready = open("rules");
    expect(screen.getByText("Cancele até 24 horas antes.")).toBeInTheDocument();
    expect(screen.getByText("Cancele até 12 horas antes.")).toBeInTheDocument();
    ready.unmount();

    const loading = open("rulesLoading");
    expect(screen.getByRole("status")).toBeInTheDocument();
    loading.unmount();

    const empty = open("rulesEmpty");
    expect(screen.getAllByText(/ainda não/i).length).toBeGreaterThan(0);
    empty.unmount();

    open("rulesError");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("IN-06-02: the instructor's profile, with Instrutor under the name, on the instructor's tab bar", () => {
    render(<ProfileScreen locale="pt-br" state="profile" rules={{ surf: "A", skate: "B" }} role="instructor" />);

    expect(screen.getByText("Rafael Rocha")).toBeInTheDocument();
    expect(screen.getByText("Instrutor")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Início" })).toBeInTheDocument();
  });
});
