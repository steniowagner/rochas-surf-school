import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextButton } from "./text-button.component";

describe("TextButton", () => {
  it("is an underlined link inside a sentence", () => {
    render(<p>Ao continuar, você aceita os <TextButton className="text-ink">Termos</TextButton>.</p>);

    expect(screen.getByRole("link", { name: "Termos" })).toHaveClass("underline", "text-ink");
  });

  it("works without a class", () => {
    render(<TextButton>Link</TextButton>);

    expect(screen.getByRole("link")).toHaveClass("font-extrabold");
  });
});
