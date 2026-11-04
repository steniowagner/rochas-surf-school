import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegistrationsScreen } from "./registrations-screen.component";

describe("RegistrationsScreen", () => {
  it("AD-07-01: the intro with how many wait and the new accounts to approve or deny, in a tall frame", () => {
    render(<RegistrationsScreen locale="pt-br" state="ready" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("3 esperando aprovação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renata Coelho" })).toHaveTextContent("renata.coelho@email.com");
    expect(screen.getAllByRole("button", { name: "Aprovar" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Recusar" })).toHaveLength(3);
  });

  it("AD-07-02..03: the deny sheet, and a new account's person sheet with its e-mail", () => {
    const deny = render(<RegistrationsScreen locale="pt-br" state="denySheet" />);
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Recusar entrada?" })).toBeInTheDocument();
    expect(screen.getByText(/Renata Coelho não vai entrar na escola/)).toBeInTheDocument();
    deny.unmount();

    render(<RegistrationsScreen locale="pt-br" state="personSheet" />);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("E-mail")).toBeInTheDocument();
    expect(within(sheet).getByText("renata.coelho@email.com")).toBeInTheDocument();
    expect(within(sheet).queryByText("Conversar por WhatsApp")).toBeNull();
  });

  it("AD-07-04..06: nobody waiting, the skeletons and the load error, the title in the header", () => {
    const empty = render(<RegistrationsScreen locale="pt-br" state="empty" />);
    expect(screen.getByRole("heading", { name: "Entrar na escola" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ninguém esperando" })).toBeInTheDocument();
    empty.unmount();

    const loading = render(<RegistrationsScreen locale="pt-br" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando os cadastros" })).toBeInTheDocument();
    loading.unmount();

    render(<RegistrationsScreen locale="pt-br" state="error" />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar os cadastros" })).toBeInTheDocument();
  });

  it("AD-07-16: the approve confirmation sheet over the list, naming the first account", () => {
    render(<RegistrationsScreen locale="pt-br" state="approveSheet" />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getByRole("heading", { name: "Aprovar entrada?" })).toBeInTheDocument();
    expect(sheet.getByText("Renata Coelho entra na escola e já pode reservar aulas. A pessoa recebe uma notificação push.")).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Aprovar" })).toHaveClass("bg-ok");
    expect(sheet.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renata Coelho" })).toBeInTheDocument();
  });

  it("AD-07-16: the approve confirmation sheet in English", () => {
    render(<RegistrationsScreen locale="en" state="approveSheet" />);

    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Approve entry?" })).toBeInTheDocument();
  });
});
