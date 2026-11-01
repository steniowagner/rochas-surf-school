import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequestSeatClassCard } from "./request-seat-class-card.component";

describe("RequestSeatClassCard", () => {
  it("draws the chips, the day, the time range and the place", () => {
    render(<RequestSeatClassCard locale="pt-br" discipline="skate" level="advanced" weekday="QUA" date="9 set" duration="1 h 30 min" timeRange="16:00 – 17:30" locationName="Praia do Futuro" />);

    expect(screen.getByText("Skate")).toHaveClass("bg-tan");
    expect(screen.getByText("Avançado")).toBeInTheDocument();
    expect(screen.getByText("9 set")).toHaveClass("text-sun");
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
    expect(screen.getByText("16:00 – 17:30")).toHaveClass("text-ink");
    expect(screen.getByText("Praia do Futuro")).toBeInTheDocument();
  });

  it("draws its own frame unless embedded", () => {
    const props = { locale: "pt-br", discipline: "surf", level: "beginner", weekday: "Quarta", date: "9 SET", duration: "1 h 30 min", timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;
    const { rerender } = render(<RequestSeatClassCard {...props} />);

    expect(screen.getByTestId("request-seat-class-card")).toHaveClass("border");
    rerender(<RequestSeatClassCard {...props} embedded />);
    expect(screen.getByTestId("request-seat-class-card")).not.toHaveClass("border");
  });
});
