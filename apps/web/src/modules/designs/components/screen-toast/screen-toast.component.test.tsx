import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScreenToast } from "./screen-toast.component";

describe("ScreenToast", () => {
  it("places the toast over the top of the screen", () => {
    render(<ScreenToast message="Sem conexão." />);

    expect(screen.getByTestId("screen-toast")).toHaveClass("absolute", "top-3");
    expect(screen.getByRole("alert")).toHaveTextContent("Sem conexão.");
  });
});
