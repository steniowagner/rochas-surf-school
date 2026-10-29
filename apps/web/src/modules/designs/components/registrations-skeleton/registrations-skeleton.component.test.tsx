import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegistrationsSkeleton } from "./registrations-skeleton.component";

describe("RegistrationsSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<RegistrationsSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando os cadastros" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(15);
  });
});
