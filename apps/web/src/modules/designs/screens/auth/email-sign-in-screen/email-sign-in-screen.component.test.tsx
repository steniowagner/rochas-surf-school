import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmailSignInScreen } from "./email-sign-in-screen.component";

describe("EmailSignInScreen", () => {
  it("draws the empty form with the button disabled (AF-02-02)", () => {
    render(<EmailSignInScreen locale="pt-br" state="empty" />);

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receber código" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toBeInTheDocument();
  });

  it("draws the invalid email with its error and the button disabled (AF-02-03)", () => {
    render(<EmailSignInScreen locale="en" state="invalid" />);

    expect(screen.getByText("ana.lima@")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Get code" })).toBeDisabled();
  });

  it("draws the spinner while the code is sent (AF-02-04)", () => {
    render(<EmailSignInScreen locale="en" state="sending" />);

    expect(screen.getByText("ana.lima@email.com")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Get code" })).toBeInTheDocument();
  });

  it("draws the send error toast with the button enabled (AF-02-05)", () => {
    render(<EmailSignInScreen locale="en" state="sendError" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't send the email. Please try again.");
    expect(screen.getByRole("button", { name: "Get code" })).toBeEnabled();
  });
});
