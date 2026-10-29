import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassCard } from "./class-card.component";
import type { ClassCardProps } from "./class-card.types";

const base: ClassCardProps = {
  locale: "pt-br",
  discipline: "surf",
  level: "beginner",
  state: "notStarted",
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
  seatsTaken: 4,
  capacity: 8,
  students: [
    { id: "1", label: "Ana Lima", erased: false },
    { id: "2", label: "Caio Souza", erased: false },
  ],
};

describe("ClassCard", () => {
  it("draws a class that has not started: chips, time, place, occupancy and students", () => {
    render(<ClassCard {...base} />);

    expect(screen.getByText("Surf")).toHaveClass("bg-lagoon");
    expect(screen.getByText("08:00 – 09:30")).toBeInTheDocument();
    expect(screen.getByText("Praia de Iracema")).toBeInTheDocument();
    expect(screen.getByText("4/8 vagas")).toBeInTheDocument();
    expect(screen.getByTestId("occupancy-fill")).toHaveStyle({ width: "50%" });
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-lagoon");
    expect(screen.getByText("4 alunos confirmados")).toBeInTheDocument();
    expect(screen.getByTestId("class-card")).toHaveClass("border-line");
  });

  it("uses the skate color for a skate class and warns when almost full", () => {
    const { rerender } = render(<ClassCard {...base} discipline="skate" />);
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-tan");

    rerender(<ClassCard {...base} seatsTaken={7} />);
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-sun");
  });

  it("shows the full chip and the bad occupancy when full", () => {
    render(<ClassCard {...base} seatsTaken={8} />);

    expect(screen.getByText("Sem vagas", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("8/8 vagas")).toHaveClass("text-bad");
    expect(screen.getByTestId("occupancy-fill")).toHaveClass("bg-bad");
  });

  it("highlights the next class with the sun border and the Next chip", () => {
    render(<ClassCard {...base} isNext />);

    expect(screen.getByTestId("class-card")).toHaveClass("border-sun", "shadow-primary");
    expect(screen.getByText("Próxima")).toBeInTheDocument();
  });

  it("does not mark a class that already started as next", () => {
    render(<ClassCard {...base} state="started" isNext />);

    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.queryByText("Próxima")).toBeNull();
    expect(screen.getByTestId("class-card")).toHaveClass("border-sun");
  });

  it("draws a finished class without the occupancy bar and dimmed, with the present label", () => {
    render(<ClassCard {...base} state="finished" />);

    expect(screen.queryByTestId("occupancy-fill")).toBeNull();
    expect(screen.getByTestId("class-card")).toHaveClass("opacity-55");
    expect(screen.getByText("Finalizada")).toBeInTheDocument();
    expect(screen.getByText("4 alunos presentes")).toBeInTheDocument();
  });

  it("draws a cancelled class with a struck time and no footer", () => {
    render(<ClassCard {...base} state="cancelled" />);

    expect(screen.getByText("08:00 – 09:30")).toHaveClass("line-through");
    expect(screen.queryByTestId("occupancy-fill")).toBeNull();
    expect(screen.queryByText(/alunos/)).toBeNull();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByTestId("class-card")).toHaveClass("opacity-78");
  });

  it("shows the admin flags only when asked", () => {
    const { rerender } = render(<ClassCard {...base} withoutInstructor withoutDeadline />);
    expect(screen.queryByText("Sem instrutor")).toBeNull();

    rerender(<ClassCard {...base} showFlags withoutInstructor withoutDeadline />);
    expect(screen.getByText("Sem instrutor")).toBeInTheDocument();
    expect(screen.getByText("Sem prazo")).toBeInTheDocument();
  });

  it("shows the enrolment chip in the place of the full chip", () => {
    render(<ClassCard {...base} seatsTaken={8} enrolment="waitingList" />);

    expect(screen.getByText("Na lista de espera")).toBeInTheDocument();
    expect(screen.queryByText("Sem vagas", { selector: "span" })).toBeNull();
  });

  it("shows +N for the seats no avatar shows, and the erased student icon", () => {
    render(
      <ClassCard
        {...base}
        seatsTaken={7}
        students={[...base.students, { id: "3", label: "Ex-aluno", erased: true }, { id: "4", label: "Dani Reis", erased: false }, { id: "5", label: "Eli Alves", erased: false }]}
      />,
    );

    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ex-aluno" }).querySelector("svg")).not.toBeNull();
  });

  it("says there are no students yet for an empty class and draws no avatars", () => {
    render(<ClassCard {...base} seatsTaken={0} students={[]} />);

    expect(screen.getByText("Ainda sem alunos")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
