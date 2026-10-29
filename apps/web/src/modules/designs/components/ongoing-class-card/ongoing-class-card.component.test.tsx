import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OngoingClassCard } from "./ongoing-class-card.component";
import type { OngoingClassCardProps } from "./ongoing-class-card.types";

const students = Array.from({ length: 6 }, (_, index) => ({ id: String(index), label: `Aluno ${index}`, erased: false }));
const props: OngoingClassCardProps = { locale: "pt-br", discipline: "surf", level: "beginner", timeRange: "06:30 – 08:00", locationName: "Praia de Iracema", seatsTaken: 6, capacity: 8, students };

describe("OngoingClassCard", () => {
  it("draws the class under way on grape, with four avatars and the others counted", () => {
    render(<OngoingClassCard {...props} />);

    expect(screen.getByTestId("ongoing-class-card")).toHaveClass("bg-grape");
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("06:30 – 08:00")).toBeInTheDocument();
    expect(screen.getByText("Praia de Iracema")).toBeInTheDocument();
    expect(screen.getByText("6/8 vagas")).toHaveClass("text-on-color");
    expect(screen.getByTestId("occupancy-fill")).toHaveStyle({ width: "75%" });
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("6 alunos confirmados")).toBeInTheDocument();
  });

  it("marks a full class and a skate one", () => {
    render(<OngoingClassCard {...props} discipline="skate" seatsTaken={8} />);

    expect(screen.getByText("Skate")).toHaveClass("bg-tan");
    expect(screen.getByText("8/8 vagas")).toHaveClass("text-on-grape-bad");
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-bad");
  });

  it("has no avatars without students", () => {
    render(<OngoingClassCard {...props} seatsTaken={0} capacity={0} students={[]} />);

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("Ainda sem alunos")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-fill")).toHaveStyle({ width: "0%" });
  });
});
