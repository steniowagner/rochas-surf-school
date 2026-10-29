import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Toast } from "./toast.component";

describe("Toast", () => {
  it("is an error by default", () => {
    render(<Toast message="Não deu certo." />);

    expect(screen.getByRole("alert")).toHaveClass("bg-bad");
    expect(screen.getByRole("alert")).toHaveTextContent("Não deu certo.");
  });

  it("draws the success tone in ok", () => {
    render(<Toast tone="success" message="Pronto!" />);

    expect(screen.getByRole("alert")).toHaveClass("bg-ok");
    expect(screen.getByRole("alert").querySelector("svg")).not.toBeNull();
  });
});
