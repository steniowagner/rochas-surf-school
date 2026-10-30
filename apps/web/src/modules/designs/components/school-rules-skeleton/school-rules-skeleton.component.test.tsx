import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRulesSkeleton } from "./school-rules-skeleton.component";

describe("SchoolRulesSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<SchoolRulesSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando as regras" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(9);
  });
});
