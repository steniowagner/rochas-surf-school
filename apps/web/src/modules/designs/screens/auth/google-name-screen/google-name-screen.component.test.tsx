import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoogleNameScreen } from "./google-name-screen.component";

describe("GoogleNameScreen", () => {
  it("draws the empty field with the button disabled (AF-02-15)", () => {
    render(<GoogleNameScreen locale="en" state="empty" />);

    expect(screen.getByRole("heading", { name: "What's your name?" })).toBeInTheDocument();
    expect(screen.getByText("First and last name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("draws the field in the error state (AF-02-16)", () => {
    render(<GoogleNameScreen locale="en" state="invalid" />);

    expect(screen.getByText("Enter your first and last name.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("draws the full name with the spinner (AF-02-17)", () => {
    render(<GoogleNameScreen locale="en" state="sending" />);

    expect(screen.getByText("Ana Beatriz Lima")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Continue" })).toBeInTheDocument();
  });

  it("draws the error toast with the button enabled (AF-02-18)", () => {
    render(<GoogleNameScreen locale="en" state="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't sign you in with Google. Try again.");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});
