import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemovedAccountsSkeleton } from "./removed-accounts-skeleton.component";

describe("RemovedAccountsSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<RemovedAccountsSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando as contas removidas" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(12);
  });
});
