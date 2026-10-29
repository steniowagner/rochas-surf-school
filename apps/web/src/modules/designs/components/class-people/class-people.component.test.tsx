import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassPeople } from "./class-people.component";
import type { ClassPeopleProps } from "./class-people.types";

const students = [
  { id: "1", label: "Ana Beatriz Lima", erased: false },
  { id: "2", label: "Caio Sousa", erased: false },
];
const props: ClassPeopleProps = { locale: "pt-br", instructors: [{ id: "i", name: "Rafael Rocha" }], students, seatsTaken: 2, capacity: 8, state: "not-started" };

describe("ClassPeople", () => {
  it("draws the instructor, the capacity line and the students' row", () => {
    render(<ClassPeople {...props} />);

    expect(screen.getByText("A aula")).toBeInTheDocument();
    expect(screen.getByText("Máx. 8 alunos · 6 vagas livres")).toHaveClass("text-ink-2");
    expect(screen.getByText("Instrutor")).toBeInTheDocument();
    expect(screen.getByText("Rafael Rocha")).toBeInTheDocument();
    expect(screen.getByText("2 alunos confirmados")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("marks a full class in bad and counts the avatars it does not show", () => {
    render(<ClassPeople {...props} seatsTaken={8} students={Array.from({ length: 6 }, (_, index) => ({ id: String(index), label: `Aluno ${index}`, erased: false }))} />);

    expect(screen.getByText("Máx. 8 alunos · esgotado")).toHaveClass("text-bad");
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("says you for the viewer's own pill and highlights it", () => {
    render(<ClassPeople {...props} instructors={[{ id: "i", name: "Rafael Rocha", isViewer: true }]} />);

    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByTestId("instructor-pill")).toHaveClass("border-lagoon");
  });

  it("says nobody teaches when there is no instructor", () => {
    render(<ClassPeople {...props} instructors={[]} />);

    expect(screen.getByText("Instrutor")).toBeInTheDocument();
    expect(screen.getByText("Sem instrutor atribuído")).toBeInTheDocument();
  });

  it("drops the capacity line of a finished class and says present", () => {
    render(<ClassPeople {...props} state="finished" />);

    expect(screen.queryByText(/Máx\./)).toBeNull();
    expect(screen.getByText("2 alunos presentes")).toBeInTheDocument();
  });

  it("has no avatars and no chevron for an empty class", () => {
    render(<ClassPeople {...props} students={[]} seatsTaken={0} state="cancelled" />);

    expect(screen.getByText("Ainda sem alunos")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(1);
    expect(screen.queryByText(/Máx\./)).toBeNull();
  });

  it("opens the list: a row per student, then the trial guests, their avatars after the students'", () => {
    const { container } = render(<ClassPeople {...props} seatsTaken={4} guests={[{ id: "g1", name: "Lucas Martins" }, { id: "g2", name: null }]} expanded />);

    expect(screen.getByRole("button", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Caio Sousa" })).toBeInTheDocument();
    expect(screen.getByText("Lucas Martins")).toBeInTheDocument();
    expect(screen.getAllByText("Trial")).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "Trial" })).toHaveLength(4);
    expect(screen.getByText("4 alunos confirmados")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="instructor-pill"]')).not.toBeNull();
  });

  it("has a chevron for a class with only guests", () => {
    const { container } = render(<ClassPeople {...props} students={[]} seatsTaken={1} guests={[{ id: "g", name: null }]} />);

    expect(screen.getAllByRole("img", { name: "Trial" })).toHaveLength(1);
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(1);
  });
});
