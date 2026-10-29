import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StackHeader } from "./stack-header.component";

describe("StackHeader", () => {
  it("draws the back chevron, the title and the right action", () => {
    const { container } = render(<StackHeader title="Aula" right={<button type="button">acao</button>} />);

    expect(screen.getByRole("heading", { name: "Aula" })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "acao" })).toBeInTheDocument();
  });

  it("centers the title between the two slots, as iOS does", () => {
    render(<StackHeader title="Aula" />);

    expect(screen.getByRole("heading", { name: "Aula" })).toHaveClass("text-center");
    expect(screen.getByRole("banner")).toHaveClass("grid");
  });

  it("omits the back chevron when asked", () => {
    const { container } = render(<StackHeader title="Aula" showBack={false} />);

    expect(container.querySelector("svg")).toBeNull();
  });
});
