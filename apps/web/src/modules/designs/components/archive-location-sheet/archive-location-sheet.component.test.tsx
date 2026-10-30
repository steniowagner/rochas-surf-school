import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArchiveLocationSheet } from "./archive-location-sheet.component";

describe("ArchiveLocationSheet", () => {
  it("asks before removing the location and says its classes stay", () => {
    render(<ArchiveLocationSheet locale="pt-br" name="Praia do Futuro" address="Av. Zezé Diogo, 3500" upcomingClasses={3} />);

    expect(screen.getByRole("heading", { name: "Remover local?" })).toBeInTheDocument();
    const card = within(screen.getByTestId("location-summary-card"));
    expect(card.getByText("Praia do Futuro")).toBeInTheDocument();
    expect(card.getByText("Av. Zezé Diogo, 3500")).toBeInTheDocument();
    expect(screen.getByText("As 3 aulas que já usam este local continuam como estão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover local" })).toHaveClass("bg-bad");
    expect(screen.getByRole("button", { name: "Manter" })).toBeInTheDocument();
  });

  it("leaves the classes line out when none uses it", () => {
    render(<ArchiveLocationSheet locale="pt-br" name="Cumbuco" address="Caucaia" upcomingClasses={0} />);

    expect(screen.queryByText(/continua/)).toBeNull();
  });
});
