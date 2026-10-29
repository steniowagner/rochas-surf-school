import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PendingScreen } from "./pending-screen.component";

describe("PendingScreen", () => {
  it("draws the intro, the three steps and the sign-out button (AF-03-01)", () => {
    render(<PendingScreen locale="en" />);

    expect(screen.getByText("Account created", { selector: "p" })).toHaveClass("text-ink-2");
    expect(screen.getByRole("heading", { name: "Waiting for approval" })).toBeInTheDocument();
    expect(screen.getByText("ana.lima@email.com")).toHaveClass("font-extrabold");
    expect(screen.getByTestId("step-done")).toBeInTheDocument();
    expect(screen.getByTestId("step-current")).toBeInTheDocument();
    expect(screen.getByTestId("step-future")).toBeInTheDocument();
    expect(screen.getByText("Sep 9")).toBeInTheDocument();
    expect(screen.getByText("Under review")).toHaveClass("text-warn");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass("text-ink");
  });

  it("prints the creation date in the page language", () => {
    render(<PendingScreen locale="pt-br" />);

    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText(/9 de set/)).toBeInTheDocument();
  });
});
