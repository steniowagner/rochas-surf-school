import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassRequestsGroup } from "./class-requests-group.component";
import type { ClassRequestsGroupProps } from "./class-requests-group.types";

const props: ClassRequestsGroupProps = {
  locale: "pt-br",
  discipline: "surf",
  level: "beginner",
  block: { weekday: "QUA", day: "9", month: "set", year: "2026" },
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
  seatsTaken: 5,
  capacity: 8,
  requests: [
    { id: "1", name: "Caio Sousa", askedAt: { time: "14:20", date: "5 set" } },
    { id: "2", name: "Elisa Alves", askedAt: { time: "09:05", date: "6 set" } },
  ],
};

describe("ClassRequestsGroup", () => {
  it("draws the class header, its occupancy and the requests to enrol or deny", () => {
    render(<ClassRequestsGroup {...props} />);

    expect(screen.getByText("QUA")).toBeInTheDocument();
    expect(screen.getByText("set 2026")).toBeInTheDocument();
    expect(screen.getByText("08:00 – 09:30")).toBeInTheDocument();
    expect(screen.getByText("Máx. 8 alunos")).toBeInTheDocument();
    expect(screen.getByText("3 vagas livres")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-lagoon");
    expect(screen.getByText("Pediu às 14:20 · 5 set")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Inscrever" })[0]).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Recusar" })).toHaveLength(2);
    expect(screen.queryByText("Lista de espera · por ordem de pedido")).toBeNull();
  });

  it("draws a full class's waiting list in order, enrolling blocked", () => {
    render(<ClassRequestsGroup {...props} discipline="skate" seatsTaken={8} />);

    expect(screen.getByText("Esgotado")).toHaveClass("text-bad");
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-bad");
    expect(screen.getByText("Lista de espera · por ordem de pedido")).toBeInTheDocument();
    expect(screen.getByText("1º Caio Sousa")).toBeInTheDocument();
    expect(screen.getByText("2º Elisa Alves")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Inscrever" })) {
      expect(button).toBeDisabled();
    }
  });

  it("draws a nearly full class in sun and a skate class in tan", () => {
    const { rerender } = render(<ClassRequestsGroup {...props} seatsTaken={7} />);

    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-sun");
    rerender(<ClassRequestsGroup {...props} discipline="skate" />);
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-tan");
  });
});
