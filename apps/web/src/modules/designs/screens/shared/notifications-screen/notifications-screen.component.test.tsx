import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationsScreen } from "./notifications-screen.component";

const items = [
  { type: "enrolment.approved", title: "Pedido aprovado", body: "Sua vaga está confirmada.", time: "Agora", read: false },
  { type: "class.reminder", title: "Sua aula começa em breve", body: "A aula começa às 08:00.", time: "há 2 h", read: true },
];
const open = (state: Parameters<typeof NotificationsScreen>[0]["state"]) => render(<NotificationsScreen locale="pt-br" state={state} items={items} />);

describe("NotificationsScreen", () => {
  it("ST-06-01: the title, mark all as read and the rows, unread first, in a tall frame", () => {
    open("list");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Avisos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar todos como lidos" })).toBeInTheDocument();
    expect(screen.getAllByTestId("notification-row-icon")).toHaveLength(2);
    expect(screen.getAllByTestId("notification-row-unread-dot")).toHaveLength(1);
    expect(screen.getByText("Sua aula começa em breve")).toBeInTheDocument();
  });

  it("ST-06-02..04: loading, empty and error have no rows and no mark-all button", () => {
    const loading = open("loading");
    expect(screen.getByRole("status", { name: "Carregando avisos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar todos como lidos" })).toBeNull();
    loading.unmount();

    const empty = open("empty");
    expect(screen.getByRole("heading", { name: "Nenhum aviso por enquanto" })).toBeInTheDocument();
    empty.unmount();

    open("error");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.queryByText("Pedido aprovado")).toBeNull();
  });

  it("ST-06-05: the list with the failure toast", () => {
    open("markAllFailed");

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível marcar os avisos como lidos. Tente de novo.");
    expect(screen.getByText("Pedido aprovado")).toBeInTheDocument();
  });
});
