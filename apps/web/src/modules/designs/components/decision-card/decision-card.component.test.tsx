import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DecisionCard } from "./decision-card.component";

const props = { title: "Ana Lima", subtitle: "ana@email.com", details: ["Surf · Iniciante"], avatar: <i data-testid="avatar" />, approveLabel: "Aprovar", denyLabel: "Recusar" };

describe("DecisionCard", () => {
  it("draws the person, the details and both buttons enabled", () => {
    render(<DecisionCard {...props} />);

    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(screen.getByText("ana@email.com")).toBeInTheDocument();
    expect(screen.getByText("Surf · Iniciante")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeEnabled();
  });

  it("omits a missing subtitle", () => {
    render(<DecisionCard {...props} subtitle={undefined} />);

    expect(screen.queryByText("ana@email.com")).toBeNull();
  });

  it("shows the spinner on the approve button while approving and disables the other", () => {
    render(<DecisionCard {...props} disabled loading="approve" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeDisabled();
  });

  it("shows the spinner on the deny button while denying and disables approve", () => {
    render(<DecisionCard {...props} disabled loading="deny" />);

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeDisabled();
  });

  it("disables approve alone", () => {
    render(<DecisionCard {...props} approveDisabled />);

    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Recusar" })).toBeEnabled();
  });

  it("sits inside another card when embedded, and opens the person's details when pressable", () => {
    const { container } = render(<DecisionCard {...props} embedded pressable />);

    expect(container.firstElementChild).not.toHaveClass("rounded-card");
    expect(screen.getByRole("button", { name: "Ana Lima" })).toBeInTheDocument();
  });
});
