import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CancelClassSheet } from "./cancel-class-sheet.component";

describe("CancelClassSheet", () => {
  it("names who will be told, warns about the guests and offers the optional message", () => {
    render(<CancelClassSheet locale="pt-br" guestCount={2} studentCount={4} pendingCount={1} instructorCount={1} />);

    expect(screen.getByRole("heading", { name: "Cancelar esta aula?" })).toBeInTheDocument();
    expect(screen.getByText("Avisamos 4 inscritos, 1 pessoa com pedido pendente e 1 instrutor. A aula fica na agenda, marcada como cancelada.")).toBeInTheDocument();
    expect(screen.getByTestId("guests-warning")).toBeInTheDocument();
    expect(screen.getByText("Mensagem (opcional)")).toBeInTheDocument();
    expect(screen.getByText("0/300")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar e avisar" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Manter aula" })).toBeInTheDocument();
  });

  it("keeps its general sentence with nobody to name, and no warning without guests", () => {
    render(<CancelClassSheet locale="pt-br" message="Mar muito grande." />);

    expect(screen.getByText("Avisamos os instrutores da aula. Ela continua na agenda, marcada como cancelada.")).toBeInTheDocument();
    expect(screen.queryByTestId("guests-warning")).toBeNull();
    expect(screen.getByText("Mar muito grande.")).toBeInTheDocument();
  });
});
