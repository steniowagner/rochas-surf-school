import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorState } from "./error-state.component";

const props = { title: "Algo deu errado", description: "Verifique sua conexão.", retryLabel: "Tentar de novo" };

describe("ErrorState", () => {
  it("draws the alert badge, texts and the ink retry button", () => {
    render(<ErrorState {...props} />);

    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveClass("bg-ink");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the spinner while retrying", () => {
    render(<ErrorState {...props} retrying />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
