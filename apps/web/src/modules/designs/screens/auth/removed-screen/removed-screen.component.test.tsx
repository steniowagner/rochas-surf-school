import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemovedScreen } from "./removed-screen.component";

describe("RemovedScreen", () => {
  it("draws the bad tile, the note and the contact button (AF-04-10)", () => {
    render(<RemovedScreen locale="en" />);

    expect(screen.getByText("Access removed")).toHaveClass("text-bad");
    expect(screen.getByText("Questions?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contact the school" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("leaves the contact button out when the school has no number (AF-04-11)", () => {
    render(<RemovedScreen locale="en" hasSchoolNumber={false} />);

    expect(screen.queryByRole("button", { name: "Contact the school" })).toBeNull();
    expect(screen.getByRole("button", { name: "Use another email" })).toBeInTheDocument();
  });

  it("draws the contact error toast (AF-04-12)", () => {
    render(<RemovedScreen locale="en" contactError />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't open WhatsApp.");
    expect(screen.getByRole("button", { name: "Contact the school" })).toBeInTheDocument();
  });
});
