import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextInput } from "./text-input.component";

describe("TextInput", () => {
  it("shows the placeholder of an empty neutral field", () => {
    const { container } = render(<TextInput icon={<i data-testid="icon" />} placeholder="voce@email.com" />);

    expect(screen.getByText("voce@email.com")).toHaveClass("text-ink-2");
    expect(container.firstElementChild?.firstElementChild).toHaveClass("border-input-line");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("shows the clear button only for a filled, clearable, editable field", () => {
    const { container, rerender } = render(<TextInput value="ana@email.com" clearable />);
    expect(container.querySelector("svg")).not.toBeNull();

    rerender(<TextInput value="ana@email.com" />);
    expect(container.querySelector("svg")).toBeNull();

    rerender(<TextInput value="ana@email.com" clearable editable={false} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("draws the error border and message", () => {
    const { container } = render(<TextInput value="x" status="error" errorMessage="Digite um e-mail válido." />);

    expect(container.firstElementChild?.firstElementChild).toHaveClass("border-bad");
    expect(screen.getByText("Digite um e-mail válido.")).toHaveClass("text-bad");
  });

  it("hides the message of a neutral field and dims a disabled one", () => {
    const { container } = render(<TextInput value="x" errorMessage="hidden" editable={false} />);

    expect(screen.queryByText("hidden")).toBeNull();
    expect(container.firstElementChild?.firstElementChild).toHaveClass("bg-dim");
    expect(screen.getByText("x")).toHaveClass("text-ink-2");
  });
});
