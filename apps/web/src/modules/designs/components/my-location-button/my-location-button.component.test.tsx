import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyLocationButton } from "./my-location-button.component";

describe("MyLocationButton", () => {
  it("draws the round button with its label", () => {
    render(<MyLocationButton locale="pt-br" />);

    expect(screen.getByRole("button", { name: "Minha localização" })).toHaveClass("rounded-full", "shadow-icon-button");
  });
});
