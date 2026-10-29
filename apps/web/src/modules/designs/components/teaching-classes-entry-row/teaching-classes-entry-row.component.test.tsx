import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeachingClassesEntryRow } from "./teaching-classes-entry-row.component";

describe("TeachingClassesEntryRow", () => {
  it("says how many classes are assigned, in a card of its own", () => {
    const { container } = render(<TeachingClassesEntryRow locale="pt-br" count={3} />);

    expect(screen.getByText("Minhas aulas")).toBeInTheDocument();
    expect(screen.getByText("3 aulas atribuídas a você")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("rounded-card");
  });

  it("says none is assigned", () => {
    render(<TeachingClassesEntryRow locale="en" count={0} grouped="first" />);

    expect(screen.getByText("No classes assigned")).toBeInTheDocument();
  });

  it("has no subtitle while the count is unknown", () => {
    const { container } = render(<TeachingClassesEntryRow locale="pt-br" count={null} grouped="next" />);

    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.firstElementChild).toHaveClass("border-t");
  });
});
