import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReactivationsScreen } from "./reactivations-screen.component";

describe("ReactivationsScreen", () => {
  it("AD-07-07: the intro and the requests with when each account was deleted and its classes, in a tall frame", () => {
    render(<ReactivationsScreen locale="pt-br" state="ready" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("2 esperando resposta")).toBeInTheDocument();
    expect(screen.getByText(/^Excluída em 12 de ago\. de 2026 · 14 aulas$/)).toBeInTheDocument();
    expect(screen.getByText(/· 1 aula$/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reativar" })).toHaveLength(2);
  });

  it("AD-07-08: the deny sheet", () => {
    render(<ReactivationsScreen locale="pt-br" state="denySheet" />);

    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Recusar reativação?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("AD-07-09..11: no request, the skeletons and the load error", () => {
    const empty = render(<ReactivationsScreen locale="pt-br" state="empty" />);
    expect(screen.getByRole("heading", { name: "Nenhum pedido" })).toBeInTheDocument();
    empty.unmount();

    const loading = render(<ReactivationsScreen locale="pt-br" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando os cadastros" })).toBeInTheDocument();
    loading.unmount();

    render(<ReactivationsScreen locale="pt-br" state="error" />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar os pedidos" })).toBeInTheDocument();
  });
});
