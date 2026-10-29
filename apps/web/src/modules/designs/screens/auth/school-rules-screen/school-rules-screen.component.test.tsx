import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRulesScreen } from "./school-rules-screen.component";

const rules = [
  { title: "Arrive early", description: "Ten minutes before." },
  { title: "Bring water", description: "Always." },
];

describe("SchoolRulesScreen", () => {
  it("draws the intro, the spinner and the disabled acceptance while loading (AF-03-08)", () => {
    render(<SchoolRulesScreen locale="en" state="loading" rules={rules} />);

    expect(screen.getByText("Last step")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "School rules" })).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Enter the app" })).toBeDisabled();
  });

  it("draws the numbered rules with the checkbox unchecked (AF-03-09)", () => {
    render(<SchoolRulesScreen locale="en" state="loaded" rules={rules} />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Bring water")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Enter the app" })).toBeDisabled();
  });

  it("draws the accepted rules with the button enabled (AF-03-10)", () => {
    render(<SchoolRulesScreen locale="en" state="accepted" rules={rules} />);

    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Enter the app" })).toBeEnabled();
  });

  it("draws the load error with the retry button (AF-03-11)", () => {
    render(<SchoolRulesScreen locale="en" state="loadError" rules={rules} />);

    expect(screen.getByText("Couldn't load the rules.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toHaveClass("bg-dim");
    expect(screen.queryByText("01")).toBeNull();
  });

  it("draws the empty message (AF-03-12)", () => {
    render(<SchoolRulesScreen locale="en" state="empty" rules={rules} />);

    expect(screen.getByText("The school has no rules yet.")).toBeInTheDocument();
  });

  it("draws the outdated toast over the loaded rules (AF-03-13)", () => {
    render(<SchoolRulesScreen locale="en" state="outdated" rules={rules} />);

    expect(screen.getByRole("alert")).toHaveTextContent("The rules changed. Read them again and accept.");
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("draws the rules update copy (AF-03-14)", () => {
    render(<SchoolRulesScreen locale="en" state="loaded" variant="rulesUpdate" rules={rules} />);

    expect(screen.getByText("Rules updated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept and continue" })).toBeDisabled();
  });
});
