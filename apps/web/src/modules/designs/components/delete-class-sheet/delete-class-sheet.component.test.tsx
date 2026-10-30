import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeleteClassSheet } from "./delete-class-sheet.component";

const classSummary = { discipline: "surf", level: "beginner", dateLabel: "Quarta-feira · 9 set", timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;

describe("DeleteClassSheet", () => {
  it("asks before deleting an empty class", () => {
    render(<DeleteClassSheet locale="pt-br" variant="confirm" classSummary={classSummary} />);

    expect(screen.getByRole("heading", { name: "Excluir esta aula?" })).toBeInTheDocument();
    expect(screen.getByTestId("class-summary-card")).toHaveTextContent("Praia de Iracema");
    expect(screen.getByRole("button", { name: "Excluir aula" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Manter aula" })).toBeInTheDocument();
  });

  it("offers to cancel a class that isn't empty instead", () => {
    render(<DeleteClassSheet locale="pt-br" variant="notEmpty" classSummary={classSummary} />);

    expect(screen.getByRole("heading", { name: "Não dá para excluir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar aula" })).toHaveClass("bg-bad");
    expect(screen.queryByRole("button", { name: "Excluir aula" })).toBeNull();
  });
});
