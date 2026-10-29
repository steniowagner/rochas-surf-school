import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WithdrawRequestSheet } from "./withdraw-request-sheet.component";

describe("WithdrawRequestSheet", () => {
  it("asks before withdrawing, with a danger button and a way to keep the request", () => {
    render(<WithdrawRequestSheet locale="pt-br" />);

    expect(screen.getByRole("heading", { name: "Anular pedido" })).toBeInTheDocument();
    expect(screen.getByText("Seu pedido para esta aula deixa de esperar aprovação.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sim, anular" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Manter pedido" })).toHaveClass("text-ink");
  });

  it("shows the spinner while withdrawing", () => {
    render(<WithdrawRequestSheet locale="pt-br" loading />);

    expect(screen.getByRole("status", { name: "Sim, anular" })).toBeInTheDocument();
  });
});
