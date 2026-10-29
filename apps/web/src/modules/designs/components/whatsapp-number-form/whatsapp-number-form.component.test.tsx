import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhatsappNumberForm } from "./whatsapp-number-form.component";

const props = {
  header: <h1>Boas-vindas</h1>,
  cardTitle: "Número do WhatsApp",
  helper: "Só pedimos para a escola falar com você.",
  hideNumberLabel: "Ocultar meu número",
  hideNumberHint: "Só os admins veem.",
  hidden: true,
  country: "BR",
  dialCode: "+55",
  placeholder: "85 91234-5678",
  submitLabel: "Salvar e continuar",
  canSubmit: false,
};

describe("WhatsappNumberForm", () => {
  it("draws the header, the card and a disabled button when the form can't be submitted", () => {
    render(<WhatsappNumberForm {...props} />);

    expect(screen.getByRole("heading", { name: "Boas-vindas" })).toBeInTheDocument();
    expect(screen.getByText("Número do WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("BR +55")).toBeInTheDocument();
    expect(screen.getByText("85 91234-5678")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Ocultar meu número" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Salvar e continuar" })).toBeDisabled();
  });

  it("draws a filled number, the error and the visible switch", () => {
    render(<WhatsappNumberForm {...props} hidden={false} value="85 9123" status="error" errorMessage="Número inválido." canSubmit />);

    expect(screen.getByText("85 9123")).toBeInTheDocument();
    expect(screen.getByText("Número inválido.")).toHaveClass("text-bad");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Salvar e continuar" })).toBeEnabled();
  });

  it("shows the spinner while saving", () => {
    render(<WhatsappNumberForm {...props} canSubmit saving />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
