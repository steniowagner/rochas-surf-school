import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileWhatsappScreen } from "./profile-whatsapp-screen.component";

const open = (state: Parameters<typeof ProfileWhatsappScreen>[0]["state"]) => render(<ProfileWhatsappScreen locale="pt-br" state={state} />);

describe("ProfileWhatsappScreen", () => {
  it("ST-05-16: the intro and the form with the current number", () => {
    open("idle");

    expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByText(/Os admins sempre veem seu número/)).toBeInTheDocument();
    expect(screen.getByText("85 99999-0000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("ST-05-17: an invalid number in the error state", () => {
    open("invalidNumber");

    expect(screen.getByText("Número de WhatsApp inválido.")).toBeInTheDocument();
  });

  it("ST-05-18: the save button shows its spinner", () => {
    open("saving");

    expect(screen.getByRole("status", { name: "Salvar" })).toBeInTheDocument();
  });
});
