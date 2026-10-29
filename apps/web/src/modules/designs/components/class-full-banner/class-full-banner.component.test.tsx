import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassFullBanner } from "./class-full-banner.component";

describe("ClassFullBanner", () => {
  it("invites to the waiting list while it is open", () => {
    render(<ClassFullBanner locale="pt-br" waitingList="open" />);

    expect(screen.getByText("Turma cheia")).toBeInTheDocument();
    expect(screen.getByText("Você pode entrar na lista de espera.")).toBeInTheDocument();
  });

  it("says the waiting list is closed", () => {
    render(<ClassFullBanner locale="en" waitingList="closed" />);

    expect(screen.getByText("Class full")).toBeInTheDocument();
    expect(screen.getByText("The waiting list is closed for this class.")).toBeInTheDocument();
  });

  it("draws the title only for the instructor", () => {
    const { container } = render(<ClassFullBanner locale="en" />);

    expect(screen.getByText("Class full")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("tells the admin where new requests go, or that the waiting list is off", () => {
    const { rerender } = render(<ClassFullBanner locale="pt-br" adminLine="newRequestsWait" />);

    expect(screen.getByText("Novos pedidos entram na lista de espera.")).toBeInTheDocument();
    rerender(<ClassFullBanner locale="pt-br" adminLine="waitingListOff" />);
    expect(screen.getByText("A lista de espera está desligada — ninguém pode pedir.")).toBeInTheDocument();
  });
});
