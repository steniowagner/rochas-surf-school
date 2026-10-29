import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReactivationScreen } from "./reactivation-screen.component";

const reason = "Sem vagas no momento.";

describe("ReactivationScreen", () => {
  it("draws the dim tile, the note and the request button (AF-04-01)", () => {
    render(<ReactivationScreen locale="en" state="notRequested" reason={reason} />);

    expect(screen.getByText("Account deleted")).toHaveClass("text-ink-2");
    expect(screen.getByText("ana.lima@email.com")).toHaveClass("font-extrabold");
    expect(screen.getByText("How to reactivate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request reactivation" })).toHaveClass("bg-sun");
    expect(screen.getByRole("button", { name: "Use another email" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws the spinner on the request button (AF-04-02)", () => {
    render(<ReactivationScreen locale="en" state="requesting" reason={reason} />);

    expect(screen.getByRole("status", { name: "Request reactivation" })).toBeInTheDocument();
  });

  it("draws the generic error toast (AF-04-03)", () => {
    render(<ReactivationScreen locale="en" state="error" reason={reason} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(screen.getByRole("button", { name: "Request reactivation" })).toBeInTheDocument();
  });

  it("draws the requested state without the request button (AF-04-04)", () => {
    render(<ReactivationScreen locale="en" state="requested" reason={reason} />);

    expect(screen.getByText("Request sent")).toBeInTheDocument();
    expect(screen.getByText("What now?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request reactivation" })).toBeNull();
  });

  it("draws the denial with the admin's reason (AF-04-05)", () => {
    render(<ReactivationScreen locale="en" state="denied" reason={reason} />);

    expect(screen.getByText("Request denied")).toHaveClass("text-bad");
    expect(screen.getByText("Message from the team")).toBeInTheDocument();
    expect(screen.getByText(reason)).toBeInTheDocument();
  });

  it("draws the denial without the note when there is no reason (AF-04-06)", () => {
    render(<ReactivationScreen locale="en" state="deniedWithoutReason" reason={reason} />);

    expect(screen.getByText("Couldn't reactivate")).toBeInTheDocument();
    expect(screen.queryByText("Message from the team")).toBeNull();
    expect(screen.queryByText(reason)).toBeNull();
  });
});
