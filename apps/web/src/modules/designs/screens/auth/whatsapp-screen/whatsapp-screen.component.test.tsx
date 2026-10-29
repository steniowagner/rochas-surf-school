import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhatsappScreen } from "./whatsapp-screen.component";

describe("WhatsappScreen", () => {
  it("draws the approved intro, the empty card and the button disabled (AF-03-02)", () => {
    render(<WhatsappScreen locale="en" state="empty" />);

    expect(screen.getByText("Account approved")).toHaveClass("text-ok");
    expect(screen.getByRole("heading", { name: "Welcome to Rocha's, Ana" })).toBeInTheDocument();
    expect(screen.getByText("WhatsApp number")).toBeInTheDocument();
    expect(screen.getByText("BR +55")).toBeInTheDocument();
    expect(screen.getByText("85 91234-5678")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Hide my number" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws the typed number with the button enabled (AF-03-03)", () => {
    render(<WhatsappScreen locale="en" state="filled" />);

    expect(screen.getByText("85 98765-4321")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeEnabled();
  });

  it("opens the country picker (AF-03-04)", () => {
    render(<WhatsappScreen locale="en" state="countryPicker" />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Search country")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
  });

  it("draws the number in the error state (AF-03-05)", () => {
    render(<WhatsappScreen locale="en" state="invalid" />);

    expect(screen.getByText("Invalid WhatsApp number.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeDisabled();
  });

  it("draws the spinner while saving (AF-03-06)", () => {
    render(<WhatsappScreen locale="en" state="saving" />);

    expect(screen.getByRole("status", { name: "Save and continue" })).toBeInTheDocument();
  });

  it("draws the save error toast (AF-03-07)", () => {
    render(<WhatsappScreen locale="en" state="saveError" />);

    expect(screen.getByRole("alert")).toHaveTextContent("No connection. Check your internet and try again.");
    expect(screen.getByRole("button", { name: "Save and continue" })).toBeEnabled();
  });
});
