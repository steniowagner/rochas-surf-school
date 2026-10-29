import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CancellationRulesSkeleton } from "./cancellation-rules-skeleton.component";

describe("CancellationRulesSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<CancellationRulesSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando a regra" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(6);
  });
});
