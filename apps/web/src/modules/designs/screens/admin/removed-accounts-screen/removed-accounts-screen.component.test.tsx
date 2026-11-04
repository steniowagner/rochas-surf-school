import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemovedAccountsScreen } from "./removed-accounts-screen.component";

describe("RemovedAccountsScreen", () => {
  it("AD-07-12: the intro with how many can be restored and the accounts, in a tall frame", () => {
    render(<RemovedAccountsScreen locale="pt-br" state="ready" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("2 restauráveis")).toBeInTheDocument();
    expect(screen.getAllByTestId("removed-account-row")).toHaveLength(2);
    expect(screen.getByText("Removida em 2 set")).toBeInTheDocument();
    expect(screen.getByText("Exclusão definitiva em 2 out")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Restaurar" })).toHaveLength(2);
  });

  it("writes the month first in English", () => {
    render(<RemovedAccountsScreen locale="en" state="ready" />);

    expect(screen.getByText(/Sep 2$/)).toBeInTheDocument();
  });

  it("AD-07-13..15: no removed account, the skeletons and the load error", () => {
    const empty = render(<RemovedAccountsScreen locale="pt-br" state="empty" />);
    expect(screen.getByRole("heading", { name: "Nenhuma conta removida" })).toBeInTheDocument();
    empty.unmount();

    const loading = render(<RemovedAccountsScreen locale="pt-br" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando as contas removidas" })).toBeInTheDocument();
    loading.unmount();

    render(<RemovedAccountsScreen locale="pt-br" state="error" />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar as contas removidas" })).toBeInTheDocument();
  });

  it("AD-07-18: the restore confirmation sheet over the list, naming the first account", () => {
    render(<RemovedAccountsScreen locale="pt-br" state="restoreSheet" />);

    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getByRole("heading", { name: "Restaurar conta?" })).toBeInTheDocument();
    expect(sheet.getByText("Sérgio Matos volta com os mesmos dados e o mesmo papel, e recebe uma notificação push.")).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Restaurar" })).toHaveClass("bg-sun");
    expect(sheet.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByText("Sérgio Matos", { selector: ":not([role=dialog] *)" })).toBeInTheDocument();
  });
});
