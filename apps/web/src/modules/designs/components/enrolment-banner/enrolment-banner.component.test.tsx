import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnrolmentBanner } from "./enrolment-banner.component";

describe("EnrolmentBanner", () => {
  it.each([
    ["pending", "Pedido pendente", "bg-warn-tint"],
    ["waitingList", "Você está na lista de espera", "bg-info-tint"],
    ["approved", "Você está inscrito", "bg-ok-tint"],
    ["denied", "Pedido recusado", "bg-bad-tint"],
    ["withdrawn", "Pedido anulado", "bg-dim"],
    ["expired", "Você não conseguiu vaga", "bg-dim"],
    ["cancelled", "Você cancelou a inscrição", "bg-dim"],
    ["takenOut", "Você foi retirado da aula", "bg-bad-tint"],
  ] as const)("draws the %s banner with its title and tone", (status, title, background) => {
    render(<EnrolmentBanner locale="pt-br" status={status} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByTestId("enrolment-banner")).toHaveClass(background);
  });

  it("tints the glyph of the approved and denied banners", () => {
    const { container, rerender } = render(<EnrolmentBanner locale="pt-br" status="approved" />);
    expect(container.querySelector("svg")).toHaveClass("text-ok");

    rerender(<EnrolmentBanner locale="pt-br" status="denied" />);
    expect(container.querySelector("svg")).toHaveClass("text-bad");
  });

  it("is a button only when pressable (the denied banner opens the reason)", () => {
    const { rerender } = render(<EnrolmentBanner locale="pt-br" status="denied" pressable />);
    expect(screen.getByRole("button")).toHaveTextContent("Toque para ver o motivo.");

    rerender(<EnrolmentBanner locale="pt-br" status="denied" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the reason of a take-out, or says there is none", () => {
    const { rerender } = render(<EnrolmentBanner locale="pt-br" status="takenOut" reason="Aula reorganizada." />);
    expect(screen.getByText("Motivo: “Aula reorganizada.”")).toBeInTheDocument();

    rerender(<EnrolmentBanner locale="pt-br" status="takenOut" />);
    expect(screen.getByText("Sem motivo indicado.")).toBeInTheDocument();
  });
});
