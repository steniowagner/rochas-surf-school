import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRulesEntryRow } from "./school-rules-entry-row.component";

describe("SchoolRulesEntryRow", () => {
  it("counts the rules for an instructor", () => {
    render(<SchoolRulesEntryRow locale="pt-br" role="instructor" count={3} grouped="next" />);

    expect(screen.getByText("Regras")).toBeInTheDocument();
    expect(screen.getByText("3 regras para todos os alunos")).toBeInTheDocument();
  });

  it("counts the rules for an admin", () => {
    render(<SchoolRulesEntryRow locale="pt-br" role="admin" count={1} />);

    expect(screen.getByText("1 regra no onboarding dos alunos")).toBeInTheDocument();
  });

  it("says there is no rule yet, and nothing while the count is unknown", () => {
    const { rerender, container } = render(<SchoolRulesEntryRow locale="pt-br" role="instructor" count={0} />);

    expect(screen.getByText("Nenhuma regra ainda")).toBeInTheDocument();
    rerender(<SchoolRulesEntryRow locale="pt-br" role="instructor" count={null} />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
