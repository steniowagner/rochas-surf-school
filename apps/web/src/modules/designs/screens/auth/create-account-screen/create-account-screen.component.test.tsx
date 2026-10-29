import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreateAccountScreen } from "./create-account-screen.component";

describe("CreateAccountScreen", () => {
  it("draws the empty fields with the button disabled (AF-02-06)", () => {
    render(<CreateAccountScreen locale="en" state="empty" />);

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByText("First and last name")).toBeInTheDocument();
    expect(screen.getByText("you@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get code" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Terms of Use" })).toBeInTheDocument();
  });

  it("draws both fields in the error state (AF-02-07)", () => {
    render(<CreateAccountScreen locale="en" state="invalid" />);

    expect(screen.getByText("Enter your first and last name.")).toHaveClass("text-bad");
    expect(screen.getByText("Enter a valid email.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Get code" })).toBeDisabled();
  });

  it("draws the filled fields with the spinner (AF-02-08)", () => {
    render(<CreateAccountScreen locale="en" state="sending" />);

    expect(screen.getByText("Ana Beatriz Lima")).toBeInTheDocument();
    expect(screen.getByText("ana.lima@email.com")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Get code" })).toBeInTheDocument();
  });

  it("draws the send error toast with the button enabled (AF-02-09)", () => {
    render(<CreateAccountScreen locale="en" state="sendError" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't send the email. Please try again.");
    expect(screen.getByRole("button", { name: "Get code" })).toBeEnabled();
  });
});
