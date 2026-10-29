import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassMessageCard } from "./class-message-card.component";
import type { ClassMessageCardProps } from "./class-message-card.types";

const props: ClassMessageCardProps = {
  locale: "pt-br",
  discipline: "surf",
  level: "beginner",
  dateLabel: "Quarta, 9 set",
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
  people: [
    { id: "rafael", label: "Rafael Rocha", erased: false, role: "instructor" },
    { id: "ana", label: "Ana Beatriz Lima", erased: false, role: "student" },
    { id: "caio", label: "Caio Sousa", erased: false, role: "student" },
    { id: "former", label: "Ex-aluno", erased: true, role: "student" },
    { id: "elisa", label: "Elisa Alves", erased: false, role: "pending" },
  ],
};

describe("ClassMessageCard", () => {
  it("draws the class and who receives the message, with three stacked avatars", () => {
    render(<ClassMessageCard {...props} />);

    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.getByText("Quarta, 9 set")).toBeInTheDocument();
    expect(screen.getByText("5 pessoas recebem")).toBeInTheDocument();
    expect(screen.getByText("1 instrutor · 3 alunos · 1 pedido pendente")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("opens the list of the people with their roles; an erased one can't be opened", () => {
    render(<ClassMessageCard {...props} expanded />);

    expect(screen.getByRole("button", { name: "Rafael Rocha" })).toHaveTextContent("Instrutor");
    expect(screen.getByRole("button", { name: "Elisa Alves" })).toHaveTextContent("Pedido pendente");
    expect(screen.queryByRole("button", { name: "Ex-aluno" })).toBeNull();
    expect(screen.getByText("Ex-aluno")).toBeInTheDocument();
  });

  it("has no summary and no chevron when nobody receives it", () => {
    const { container } = render(<ClassMessageCard {...props} people={[]} />);

    expect(screen.getByText("0 pessoa recebe")).toBeInTheDocument();
    expect(container.querySelectorAll('[role="button"] svg')).toHaveLength(0);
  });
});
