import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeniedScreen } from "./denied-screen.component";

describe("DeniedScreen", () => {
  it("draws the bad tile, the reason and the contact button (AF-04-07)", () => {
    render(<DeniedScreen locale="en" reason="Sem vagas." />);

    expect(screen.getByText("Registration not approved")).toHaveClass("text-bad");
    expect(screen.getByRole("heading", { name: "Not this time" })).toBeInTheDocument();
    expect(screen.getByText("Message from the team")).toBeInTheDocument();
    expect(screen.getByText("Sem vagas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contact the school" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use another email" })).toHaveClass("text-ink");
  });

  it("leaves the note out without a reason (AF-04-08)", () => {
    render(<DeniedScreen locale="en" />);

    expect(screen.queryByText("Message from the team")).toBeNull();
    expect(screen.getByRole("button", { name: "Contact the school" })).toBeInTheDocument();
  });

  it("leaves the contact button out when the school has no number (AF-04-09)", () => {
    render(<DeniedScreen locale="en" reason="Sem vagas." hasSchoolNumber={false} />);

    expect(screen.queryByRole("button", { name: "Contact the school" })).toBeNull();
    expect(screen.getByRole("button", { name: "Use another email" })).toBeInTheDocument();
  });
});
