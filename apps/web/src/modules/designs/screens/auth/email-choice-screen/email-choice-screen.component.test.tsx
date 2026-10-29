import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmailChoiceScreen } from "./email-choice-screen.component";

describe("EmailChoiceScreen", () => {
  it("draws the intro, the two choices and the terms (AF-02-01)", () => {
    render(<EmailChoiceScreen locale="pt-br" />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continuar com e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Já tenho conta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "É minha primeira vez" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toBeInTheDocument();
  });
});
